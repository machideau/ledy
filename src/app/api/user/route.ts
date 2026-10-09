import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation";
import type { ApiError, UserPublic } from "@/lib/types";

// GET /api/user — current user profile
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json<UserPublic>({
    id: user.id,
    phone: user.phone,
    name: user.name,
    referralCode: user.referralCode,
  });
}

// PATCH /api/user — update profile (name, phone, default withdraw method)
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { name, phone } = parsed.data;

  // If phone changed, check uniqueness
  if (phone && phone !== user.phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return NextResponse.json<ApiError>(
        { error: "Ce numéro est déjà utilisé." },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone && { phone }),
    },
  });

  return NextResponse.json<UserPublic>({
    id: updated.id,
    phone: updated.phone,
    name: updated.name,
    referralCode: updated.referralCode,
  });
}

// POST /api/user/password — change password
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json<ApiError>(
      { error: "Mot de passe actuel incorrect." },
      { status: 401 }
    );
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
