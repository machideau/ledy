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

  const [
    userCount,
    investmentCount,
    withdrawalCount,
    pendingWithdrawalCount,
    investments,
    withdrawals,
    referrals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.investment.count(),
    prisma.withdrawal.count(),
    prisma.withdrawal.count({ where: { status: "pending" } }),
    prisma.investment.findMany({ select: { amount: true, gain: true, status: true } }),
    prisma.withdrawal.findMany({ select: { amount: true, status: true } }),
    prisma.referral.findMany({ select: { commission: true, status: true } }),
  ]);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalGainsPaid = investments
    .filter((i) => i.status === "completed")
    .reduce((s, i) => s + i.gain, 0);
  const totalWithdrawn = withdrawals
    .filter((w) => w.status === "paid")
    .reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawalAmount = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0);
  const totalCommissions = referrals
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.commission, 0);
  const activeInvestments = investments.filter((i) => i.status === "active").length;
  const completedInvestments = investments.filter((i) => i.status === "completed").length;

  return NextResponse.json({
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
  });
}
