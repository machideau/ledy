import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { maskPhone, REFERRAL_COMMISSION } from "@/lib/plans";
import type { ApiError, ReferralDTO } from "@/lib/types";

// GET /api/referrals — list current user's referrals with stats
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  // Build referral link from the actual request origin so it works on any domain.
  const origin = request.nextUrl.origin;

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const totalEarned = referrals
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.commission, 0);
  const totalPending = referrals
    .filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.commission, 0);
  const countPaid = referrals.filter((r) => r.status === "paid").length;
  const countPending = referrals.filter((r) => r.status === "pending").length;

  const dto: ReferralDTO[] = referrals.map((ref) => ({
    id: ref.id,
    phone: maskPhone(ref.referredPhone),
    planName: (ref.planName || null) as ReferralDTO["planName"],
    amount: ref.amount,
    commission: ref.commission,
    status: ref.status as "pending" | "paid",
    createdAt: ref.createdAt.toISOString(),
  }));

  return NextResponse.json({
    referrals: dto,
    stats: {
      total: referrals.length,
      totalEarned,
      totalPending,
      countPaid,
      countPending,
      commissionPerReferral: REFERRAL_COMMISSION,
    },
    referralCode: user.referralCode,
    referralLink: `${origin}/auth?ref=${user.referralCode}`,
  });
}
