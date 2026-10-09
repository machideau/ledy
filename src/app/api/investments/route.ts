import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { investSchema } from "@/lib/validation";
import { PLAN_BY_ID, INVESTMENT_DURATION_DAYS } from "@/lib/plans";
import type { ApiError } from "@/lib/types";

// GET /api/investments — list current user's investments
export async function GET() {
  const user = await requireUser();

  const investments = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    investments.map((inv) => ({
      id: inv.id,
      planName: inv.planName,
      amount: inv.amount,
      remb: inv.remb,
      gain: inv.gain,
      status: inv.status,
      daysLeft: inv.daysLeft,
      createdAt: inv.createdAt.toISOString(),
    }))
  );
}

// POST /api/investments — create a new investment (payment deferred)
export async function POST(request: Request) {
  const user = await requireUser();

  const body = await request.json();
  const parsed = investSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { planId } = parsed.data;
  const plan = PLAN_BY_ID[planId];

  if (!plan) {
    return NextResponse.json<ApiError>({ error: "Plan invalide." }, { status: 400 });
  }

  // Create the investment record
  const investment = await prisma.investment.create({
    data: {
      userId: user.id,
      planName: plan.name,
      amount: plan.amount,
      remb: plan.remb,
      gain: plan.gain,
      status: "active",
      daysLeft: INVESTMENT_DURATION_DAYS,
    },
  });

  // If the user was referred, mark the sponsor's referral as paid
  if (user.referredBy) {
    const sponsor = await prisma.user.findUnique({
      where: { referralCode: user.referredBy },
    });

    if (sponsor) {
      // Find the pending referral record
      const referral = await prisma.referral.findFirst({
        where: {
          referrerId: sponsor.id,
          referredPhone: user.phone,
          status: "pending",
        },
      });

      if (referral) {
        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            planName: plan.name,
            amount: plan.amount,
            status: "paid",
          },
        });
      }
    }
  }

  return NextResponse.json(
    {
      id: investment.id,
      planName: investment.planName,
      amount: investment.amount,
      remb: investment.remb,
      gain: investment.gain,
      status: investment.status,
      daysLeft: investment.daysLeft,
      createdAt: investment.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
