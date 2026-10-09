import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

export async function GET() {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      investments: { select: { amount: true, gain: true, status: true } },
      withdrawals: { select: { amount: true, status: true } },
      referrals: { select: { commission: true, status: true } },
    },
  });

  const dto = users.map((u) => {
    const totalInvested = u.investments.reduce((s, i) => s + i.amount, 0);
    const totalGains = u.investments
      .filter((i) => i.status === "completed")
      .reduce((s, i) => s + i.gain, 0);
    const totalRemb = u.investments.reduce((s, i) => s + Math.floor(i.amount / 2), 0);
    const totalCommissions = u.referrals
      .filter((r) => r.status === "paid")
      .reduce((s, r) => s + r.commission, 0);
    const totalWithdrawn = u.withdrawals
      .filter((w) => w.status === "paid")
      .reduce((s, w) => s + w.amount, 0);

    return {
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      referralCode: u.referralCode,
      referredBy: u.referredBy,
      createdAt: u.createdAt.toISOString(),
      investmentCount: u.investments.length,
      activeInvestments: u.investments.filter((i) => i.status === "active").length,
      totalInvested,
      totalGains,
      totalRemb,
      totalCommissions,
      totalWithdrawn,
      walletBalance: totalRemb + totalGains + totalCommissions,
    };
  });

  return NextResponse.json({ users: dto });
}
