import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, tokenMaxAge, COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import type { AuthResponse, ApiError } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
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
