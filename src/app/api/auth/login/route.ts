import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, tokenMaxAge, COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { isRateLimited } from "@/lib/rateLimit";
import type { AuthResponse, ApiError } from "@/lib/types";

// Allow 10 login attempts per phone number per 15 minutes.
const LOGIN_MAX = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  // Peek at the phone before full validation so we can rate-limit early.
  // We use the raw IP as fallback when the body can't be parsed yet.
  let rateLimitKey = "ip:" + (request.headers.get("x-forwarded-for") ?? "unknown");

  let body: unknown;
  try {
    body = await request.json();
    if (typeof (body as Record<string, unknown>).phone === "string") {
      rateLimitKey = "phone:" + (body as Record<string, unknown>).phone;
    }
  } catch {
    return NextResponse.json<ApiError>({ error: "Données invalides." }, { status: 400 });
  }

  if (isRateLimited(rateLimitKey, LOGIN_MAX, LOGIN_WINDOW_MS)) {
    return NextResponse.json<ApiError>(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 }
    );
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { phone, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return NextResponse.json<ApiError>(
      { error: "Numéro ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json<ApiError>(
      { error: "Numéro ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const token = await signToken(user.id);

  const response = NextResponse.json<AuthResponse>({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      referralCode: user.referralCode,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: tokenMaxAge,
    path: "/",
  });

  return response;
}
