import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, tokenMaxAge, COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateReferralCode } from "@/lib/plans";
import { isRateLimited } from "@/lib/rateLimit";
import type { AuthResponse, ApiError } from "@/lib/types";

// Allow 5 registration attempts per IP per 15 minutes.
const REGISTER_MAX = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  // Rate-limit by IP before doing any DB work
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitKey = "register:ip:" + ip;
  if (isRateLimited(rateLimitKey, REGISTER_MAX, REGISTER_WINDOW_MS)) {
    return NextResponse.json<ApiError>(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { phone, password, referralCode } = parsed.data;

  // Check if phone already registered — use a generic message to avoid enumeration (#3)
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json<ApiError>(
      { error: "Inscription impossible. Vérifiez vos informations ou contactez le support." },
      { status: 409 }
    );
  }

  // referralCode is required — validate it against the DB
  const sponsor = await prisma.user.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
    select: { id: true },
  });
  if (!sponsor) {
    return NextResponse.json<ApiError>(
      { error: "Code de parrainage invalide." },
      { status: 400 }
    );
  }

  const hashedPassword = await hashPassword(password);

  // Generate a unique referral code (retry on collision — very rare but possible)
  let newReferralCode = generateReferralCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await prisma.user.findUnique({ where: { referralCode: newReferralCode }, select: { id: true } });
    if (!taken) break;
    newReferralCode = generateReferralCode();
  }

  const user = await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      referralCode: newReferralCode,
      referredBy: referralCode.toUpperCase(),
    },
  });

  // Create a pending referral record for the sponsor
  await prisma.referral.create({
    data: {
      referrerId: sponsor.id,
      referredPhone: phone,
      commission: 500,
      status: "pending",
    },
  });

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
