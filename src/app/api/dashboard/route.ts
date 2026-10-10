import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { maskPhone, REFERRAL_COMMISSION } from "@/lib/plans";
import type { DashboardData, ApiError } from "@/lib/types";

// GET /api/dashboard — aggregated data for the dashboard page
// #8  — walletBalance now subtracts pending + paid withdrawals so the displayed
//        balance matches exactly what the user can still withdraw.
// #9  — still derives balance on-the-fly from source records for correctness,
//        but also syncs the denormalised User.balance field for future reads.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  const origin = request.nextUrl.origin;

  const [investments, referrals, withdrawals] = await Promise.all([
    prisma.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    // #8 — also fetch withdrawals to subtract from balance
    prisma.withdrawal.findMany({
      where: { userId: user.id, status: { in: ["pending", "paid"] } },
      select: { amount: true },
    }),
  ]);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalRemb = investments.reduce((s, i) => s + i.remb, 0);

  // Gains credited so far = sum of paid tranches across all investments.
  // Each tranche = gain/3 = amount.
  // An active investment may have 0, 1, or 2 tranches already paid;
  // a completed investment always has all 3.
  const totalGainCredited = investments.reduce((s, inv) => {
    const tranche = Math.floor(inv.gain / 3);
    const paid =
      (inv.tranche1PaidAt ? tranche : 0) +
      (inv.tranche2PaidAt ? tranche : 0) +
      (inv.tranche3PaidAt ? tranche : 0);
    return s + paid;
  }, 0);

  const referralEarnings = referrals
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.commission, 0);
  const pendingReferrals = referrals.filter((r) => r.status === "pending").length;

  // #8 — subtract already-requested withdrawals so the displayed balance is accurate
  const withdrawnAmount = withdrawals.reduce((s, w) => s + w.amount, 0);
  const walletBalance = totalRemb + totalGainCredited + referralEarnings - withdrawnAmount;

  // #9 — keep denormalised balance in sync (fire-and-forget, non-blocking)
  prisma.user.update({
    where: { id: user.id },
    data:  { balance: Math.max(0, walletBalance) },
  }).catch(() => { /* non-critical */ });

  return NextResponse.json<DashboardData>({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      referralCode: user.referralCode,
    },
    walletBalance,
    totalInvested,
    referralEarnings,
    pendingReferrals,
    investments: investments.map((inv) => ({
      id: inv.id,
      planName: inv.planName as DashboardData["investments"][number]["planName"],
      amount: inv.amount,
      remb: inv.remb,
      gain: inv.gain,
      tranche: Math.floor(inv.gain / 3),
      tranche1PaidAt: inv.tranche1PaidAt?.toISOString() ?? null,
      tranche2PaidAt: inv.tranche2PaidAt?.toISOString() ?? null,
      tranche3PaidAt: inv.tranche3PaidAt?.toISOString() ?? null,
      status: inv.status as "active" | "completed",
      daysLeft: inv.daysLeft,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    })),
    referrals: referrals.map((ref) => ({
      id: ref.id,
      phone: maskPhone(ref.referredPhone),
      planName: (ref.planName || null) as DashboardData["referrals"][number]["planName"],
      amount: ref.amount,
      commission: ref.commission,
      status: ref.status as "pending" | "paid",
      createdAt: ref.createdAt.toISOString(),
    })),
    referralLink: `${origin}/auth?ref=${user.referralCode}`,
    REFERRAL_COMMISSION,
  });
}
