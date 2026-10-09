import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PLAN_BY_ID } from "@/lib/plans";
import { investSchema } from "@/lib/validation";
import { createPayment } from "@/lib/tchin";
import type { ApiError } from "@/lib/types";

// POST /api/tchin/pay
// Creates a Tchin payment for a given plan.
// Returns { payment_url, token } — the client redirects the user to payment_url.
export async function POST(request: Request) {
  const user = await requireUser();

  const body = await request.json();
  const parsed = investSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { planId, paymentMethod, phone } = parsed.data;
  const plan = PLAN_BY_ID[planId];

  if (!plan) {
    return NextResponse.json<ApiError>({ error: "Plan invalide." }, { status: 400 });
  }

  // Webhook URL where Tchin will POST confirmation
  const webhookUrl = process.env.TCHIN_WEBHOOK_URL!;
  // Redirect URL after payment (back to /dashboard with success indicator)
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = `${appBase}/dashboard?payment=success`;

  const tchinResponse = await createPayment({
    amount: plan.amount,
    description: `LEED Togo — Plan ${plan.name}`,
    phone,
    operator: paymentMethod,
    webhook_url: webhookUrl,
    redirect_url: redirectUrl,
    metadata: {
      userId: user.id,
      planId,
    },
  });

  // Persist pending payment for webhook lookup
  await prisma.pendingPayment.create({
    data: {
      tchinToken: tchinResponse.token,
      userId: user.id,
      planId,
      payMethod: paymentMethod,
      phone,
      status: "pending",
    },
  });

  return NextResponse.json({
    token: tchinResponse.token,
    payment_url: tchinResponse.payment_url,
    env: tchinResponse.env,
  });
}
