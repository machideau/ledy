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
// After payment, Tchin redirects back to return_url with ?status=success&token=…
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

  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // callback_url: where Tchin POSTs the signed webhook confirmation
  // return_url:   where Tchin redirects the user after payment (adds ?status=…&token=…)
  const callbackUrl = process.env.TCHIN_WEBHOOK_URL!;
  const returnUrl = `${appBase}/dashboard?payment=success`;

  let tchinResponse;
  try {
    tchinResponse = await createPayment({
      amount: plan.amount,
      description: `LEED Togo — Plan ${plan.name}`,
      callback_url: callbackUrl,
      return_url: returnUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tchin: payment creation failed";
    console.error("[tchin/pay] createPayment error:", message);
    return NextResponse.json<ApiError>({ error: message }, { status: 502 });
  }

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
