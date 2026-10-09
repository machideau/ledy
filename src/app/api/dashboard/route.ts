import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { maskPhone, REFERRAL_COMMISSION } from "@/lib/plans";
import type { DashboardData, ApiError } from "@/lib/types";

// GET /api/dashboard — aggregated data for the dashboard page
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  // Build referral link from the actual request origin so it works on any domain.
  const origin = request.nextUrl.origin;

  const [investments, referrals] = await Promise.all([
    prisma.investment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { referrerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalRemb = investments.reduce((s, i) => s + i.remb, 0);
  // Gains J+30 des investissements terminés (disponibles pour retrait)
  const completedGains = investments
    .filter((i) => i.status === "completed")
    .reduce((s, i) => s + i.gain, 0);
  const referralEarnings = referrals
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.commission, 0);
  const pendingReferrals = referrals.filter((r) => r.status === "pending").length;
  // Wallet = remboursements immédiats + gains J+30 débloqués + commissions parrainage
  const walletBalance = totalRemb + completedGains + referralEarnings;

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
  });
}
