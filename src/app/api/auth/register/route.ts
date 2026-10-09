import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, tokenMaxAge, COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { generateReferralCode } from "@/lib/plans";
import type { AuthResponse, ApiError } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { phone, password, referralCode } = parsed.data;

  // Check if phone already registered
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json<ApiError>(
      { error: "Ce numéro est déjà inscrit." },
      { status: 409 }
    );
  }

  // Validate referral code if provided
  let sponsor: { id: string } | null = null;
  if (referralCode) {
    sponsor = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true },
    });
    if (!sponsor) {
      return NextResponse.json<ApiError>(
        { error: "Code de parrainage invalide." },
        { status: 400 }
      );
    }
  }

  const hashedPassword = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      referralCode: generateReferralCode(),
      referredBy: sponsor ? referralCode!.toUpperCase() : null,
    },
  });

  // If referred, create a pending referral record for the sponsor
  if (sponsor) {
    await prisma.referral.create({
      data: {
        referrerId: sponsor.id,
        referredPhone: phone,
        commission: 500,
        status: "pending",
      },
    });
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
