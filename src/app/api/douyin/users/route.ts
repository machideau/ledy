import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import { logAdminAction } from "@/lib/adminLog";
import { $Enums } from "@/generated/prisma/client";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/users?page=1&limit=50&search=xxx
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const search = searchParams.get("search")?.trim() ?? "";

  const where = search
    ? {
        OR: [
          { phone:        { contains: search } },
          { name:         { contains: search, mode: "insensitive" as const } },
          { referralCode: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        investments: { select: { amount: true, remb: true, gain: true, status: true } },
        withdrawals: { select: { amount: true, status: true } },
        referrals:   { select: { commission: true, status: true } },
      },
    }),
  ]);

  const dto = users.map((u) => {
    const totalInvested    = u.investments.reduce((s, i) => s + i.amount, 0);
    const totalRemb        = u.investments.reduce((s, i) => s + i.remb,   0);
    const totalGains       = u.investments.filter(i => i.status === "completed").reduce((s, i) => s + i.gain, 0);
    const totalCommissions = u.referrals.filter(r => r.status === "paid").reduce((s, r) => s + r.commission, 0);
    const totalWithdrawn   = u.withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0);
    // Bug fix: subtract already-withdrawn amounts from wallet balance
    const walletBalance    = totalRemb + totalGains + totalCommissions - totalWithdrawn;

    return {
      id:               u.id,
      phone:            u.phone,
      name:             u.name,
      role:             u.role,
      suspended:        u.suspended,
      referralCode:     u.referralCode,
      referredBy:       u.referredBy,
      createdAt:        u.createdAt.toISOString(),
      investmentCount:  u.investments.length,
      activeInvestments: u.investments.filter(i => i.status === "active").length,
      totalInvested,
      totalRemb,
      totalGains,
      totalCommissions,
      totalWithdrawn,
      walletBalance,
    };
  });

  return NextResponse.json({
    users: dto,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// PATCH /api/douyin/users — update name, phone, role, or suspension
export async function PATCH(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireDouyin>>;
  try {
    admin = await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, phone, role, suspended } = body as {
    id?:        string;
    name?:      string;
    phone?:     string;
    role?:      string;
    suspended?: boolean;
  };

  if (!id) return NextResponse.json<ApiError>({ error: "id requis." }, { status: 400 });

  if (role !== undefined && !["user", "douyin"].includes(role)) {
    return NextResponse.json<ApiError>({ error: "Rôle invalide (user | douyin)." }, { status: 400 });
  }
  const typedRole = role as $Enums.UserRole | undefined;

  // Cannot suspend/edit a douyin admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, phone: true } });
  if (!target) return NextResponse.json<ApiError>({ error: "Utilisateur introuvable." }, { status: 404 });
  if (target.role === "douyin" && suspended === true) {
    return NextResponse.json<ApiError>({ error: "Impossible de suspendre un compte admin." }, { status: 403 });
  }

  if (phone) {
    const existing = await prisma.user.findFirst({ where: { phone, NOT: { id } } });
    if (existing) {
      return NextResponse.json<ApiError>({ error: "Ce numéro est déjà utilisé." }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name         !== undefined ? { name: name || null }    : {}),
      ...(phone                      ? { phone }                 : {}),
      ...(typedRole    !== undefined ? { role: typedRole }       : {}),
      ...(suspended    !== undefined ? { suspended }             : {}),
    },
    select: { id: true, phone: true, name: true, role: true, suspended: true, referralCode: true },
  });

  // Audit log
  const action = suspended === true  ? "user.suspend"
               : suspended === false ? "user.unsuspend"
               : "user.edit";
  await logAdminAction({ adminId: admin.id, action, targetId: id, targetType: "user", meta: { phone: target.phone } });

  return NextResponse.json(updated);
}

// DELETE /api/douyin/users — delete a user
export async function DELETE(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireDouyin>>;
  try {
    admin = await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body as { id?: string };

  if (!id) return NextResponse.json<ApiError>({ error: "id requis." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { role: true, phone: true } });
  if (!user) return NextResponse.json<ApiError>({ error: "Utilisateur introuvable." }, { status: 404 });
  if (user.role === "douyin") {
    return NextResponse.json<ApiError>({ error: "Impossible de supprimer un compte admin." }, { status: 403 });
  }

  // Block deletion if the user has active investments or pending withdrawals
  // to prevent an admin from erasing financial obligations.
  const [activeInvestments, pendingWithdrawals] = await Promise.all([
    prisma.investment.count({ where: { userId: id, status: "active" } }),
    prisma.withdrawal.count({ where: { userId: id, status: "pending" } }),
  ]);
  if (activeInvestments > 0 || pendingWithdrawals > 0) {
    return NextResponse.json<ApiError>(
      {
        error:
          "Impossible de supprimer ce compte : il possède des investissements actifs ou des retraits en attente.",
      },
      { status: 409 }
    );
  }

  await prisma.user.delete({ where: { id } });
  await logAdminAction({ adminId: admin.id, action: "user.delete", targetId: id, targetType: "user", meta: { phone: user.phone } });

  return NextResponse.json({ success: true });
}
