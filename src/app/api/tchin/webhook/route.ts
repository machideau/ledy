import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_BY_ID, INVESTMENT_DURATION_DAYS } from "@/lib/plans";
import { parseTchinWebhook, isWebhookLegit } from "@/lib/tchin";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// POST /api/tchin/webhook
// Tchin calls this when a payment is completed or fails.
// Body: application/x-www-form-urlencoded, payload nested under the "data" key (JSON).
// CRITICAL: Only activate investments on a signed/verified webhook.
export async function POST(request: Request) {
  // Read raw body — needed for HMAC verification
  const rawBody = await request.text().catch(() => "");

  const payload = parseTchinWebhook(rawBody);

  if (!payload) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify the webhook is legitimate (HMAC-SHA256 + env-mode + timestamp)
  if (!isWebhookLegit(payload)) {
    console.warn("[tchin/webhook] Rejected webhook — bad signature or mode:", {
      mode: payload.mode,
      token: payload.token,
    });
    return NextResponse.json({ error: "Rejected" }, { status: 403 });
  }

  // "reference" is the payment link token; "token" is the unique transaction id.
  // We stored the link token (reference) as tchinToken in PendingPayment.
  const pendingToken = payload.reference ?? payload.token;

  if (!pendingToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Find the pending payment
  const pending = await prisma.pendingPayment.findUnique({
    where: { tchinToken: pendingToken },
  });

  if (!pending) {
    // Unknown token — return 200 to stop Tchin retrying
    return NextResponse.json({ received: true });
  }

  // Idempotence: ignore if already processed
  if (pending.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  if (payload.status === "completed") {
    const plan = PLAN_BY_ID[pending.planId];

    if (!plan) {
      await prisma.pendingPayment.update({
        where: { tchinToken: pendingToken },
        data: { status: "failed" },
      });
      return NextResponse.json({ received: true });
    }

    // Run atomically: update pending + create investment + credit referral + update balance
    await prisma.$transaction(async (tx) => {
      // Mark pending as completed
      await tx.pendingPayment.update({
        where: { tchinToken: pendingToken },
        data: { status: "completed" },
      });

      // Create the investment
      const now = new Date();
      const investment = await tx.investment.create({
        data: {
          userId: pending.userId,
          planName: plan.name,
          amount: plan.amount,
          remb: plan.remb,
          gain: plan.gain,
          status: "active",
          daysLeft: INVESTMENT_DURATION_DAYS,
          expiresAt: addDays(now, INVESTMENT_DURATION_DAYS),
          tchinToken: pendingToken,
        },
      });

      // #9 — credit the 50% immediate refund to the denormalised balance
      await tx.user.update({
        where: { id: pending.userId },
        data:  { balance: { increment: investment.remb } },
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

            // #9 — credit commission to sponsor's denormalised balance
            await tx.user.update({
              where: { id: sponsor.id },
              data:  { balance: { increment: referral.commission } },
            });
          }
        }
      }
    });
  } else if (payload.status === "failed" || payload.status === "cancelled") {
    await prisma.pendingPayment.update({
      where: { tchinToken: pendingToken },
      data: { status: "failed" },
    });
  }

  // Always return 200 so Tchin doesn't retry
  return NextResponse.json({ received: true });
}
