import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/stats?period=all|today|7d|30d
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "all";
  const now = new Date();

  function periodFilter(): { gte: Date } | undefined {
    if (period === "today") {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      return { gte: d };
    }
    if (period === "7d")  return { gte: new Date(now.getTime() - 7  * 86400_000) };
    if (period === "30d") return { gte: new Date(now.getTime() - 30 * 86400_000) };
    return undefined;
  }

  const createdAtFilter = periodFilter();
  const where = createdAtFilter ? { createdAt: createdAtFilter } : {};

  const [
    userCount,
    investmentCount,
    withdrawalCount,
    pendingWithdrawalCount,
    investments,
    withdrawals,
    referrals,
    planBreakdown,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.investment.count({ where }),
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.count({ where: { status: "pending", ...where } }),
    prisma.investment.findMany({ select: { amount: true, gain: true, status: true }, where }),
    prisma.withdrawal.findMany({ select: { amount: true, status: true }, where }),
    prisma.referral.findMany({ select: { commission: true, status: true }, where }),
    prisma.investment.groupBy({
      by: ["planName"],
      where,
      _count: { id: true },
      _sum:   { amount: true, gain: true },
    }),
  ]);

  const totalInvested         = investments.reduce((s, i) => s + i.amount, 0);
  const totalGainsPaid        = investments.filter(i => i.status === "completed").reduce((s, i) => s + i.gain, 0);
  const totalWithdrawn        = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawalAmount = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0);
  const totalCommissions      = referrals.filter(r => r.status === "paid").reduce((s, r) => s + r.commission, 0);
  const activeInvestments     = investments.filter(i => i.status === "active").length;
  const completedInvestments  = investments.filter(i => i.status === "completed").length;

  return NextResponse.json({
    period,
    userCount,
    investmentCount,
    activeInvestments,
    completedInvestments,
    withdrawalCount,
    pendingWithdrawalCount,
    totalInvested,
    totalGainsPaid,
    totalWithdrawn,
    pendingWithdrawalAmount,
    totalCommissions,
    // Breakdown per plan: [{ planName, count, totalInvested, totalGain }]
    planBreakdown: planBreakdown.map(p => ({
      planName:      p.planName,
      count:         p._count.id,
      totalInvested: p._sum.amount ?? 0,
      totalGain:     p._sum.gain   ?? 0,
    })),
  });
}
