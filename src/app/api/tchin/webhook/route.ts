import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_BY_ID, INVESTMENT_DURATION_DAYS } from "@/lib/plans";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
import { isWebhookLegit, type TchinWebhookPayload } from "@/lib/tchin";

// POST /api/tchin/webhook
// Tchin calls this when a payment is completed or fails.
// CRITICAL: Only activate investments on a signed/verified webhook.
export async function POST(request: Request) {
  let payload: TchinWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify the webhook is legitimate
  if (!isWebhookLegit(payload)) {
    return NextResponse.json({ error: "Rejected" }, { status: 403 });
  }

  const { token, status } = payload;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Find the pending payment
  const pending = await prisma.pendingPayment.findUnique({
    where: { tchinToken: token },
  });

  if (!pending) {
    // Unknown token — return 200 to stop Tchin retrying
    return NextResponse.json({ received: true });
  }

  // Idempotence: ignore if already processed
  if (pending.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  if (status === "completed") {
    const plan = PLAN_BY_ID[pending.planId];

    if (!plan) {
      await prisma.pendingPayment.update({
        where: { tchinToken: token },
        data: { status: "failed" },
      });
      return NextResponse.json({ received: true });
    }

    // Run atomically: update pending + create investment + credit referral
    await prisma.$transaction(async (tx) => {
      // Mark pending as completed
      await tx.pendingPayment.update({
        where: { tchinToken: token },
        data: { status: "completed" },
      });

      // Create the investment
      const now = new Date();
      await tx.investment.create({
        data: {
          userId: pending.userId,
          planName: plan.name,
          amount: plan.amount,
          remb: plan.remb,
          gain: plan.gain,
          status: "active",
          daysLeft: INVESTMENT_DURATION_DAYS,
          expiresAt: addDays(now, INVESTMENT_DURATION_DAYS),
          tchinToken: token,
        },
      });

      // Check if user was referred — pay sponsor's commission
      const user = await tx.user.findUnique({
        where: { id: pending.userId },
        select: { phone: true, referredBy: true },
      });

      if (user?.referredBy) {
        const sponsor = await tx.user.findUnique({
          where: { referralCode: user.referredBy },
          select: { id: true },
        });

        if (sponsor) {
          const referral = await tx.referral.findFirst({
            where: {
              referrerId: sponsor.id,
              referredPhone: user.phone,
              status: "pending",
            },
          });

          if (referral) {
            await tx.referral.update({
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
    });
  } else if (status === "failed") {
    await prisma.pendingPayment.update({
      where: { tchinToken: token },
      data: { status: "failed" },
    });
  }

  // Always return 200 so Tchin doesn't retry
  return NextResponse.json({ received: true });
}
