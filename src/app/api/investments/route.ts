import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
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
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  );
}

// POST — investments are created exclusively via the Tchin payment flow.
// (#6) Removing the direct creation route prevents bypassing payment.
// Use POST /api/tchin/pay to initiate a payment, then the webhook
// at /api/tchin/webhook will create the investment on confirmation.
export async function POST() {
  return NextResponse.json<ApiError>(
    { error: "Les investissements doivent être créés via le flux de paiement Tchin. Utilisez POST /api/tchin/pay." },
    { status: 405 }
  );
}
