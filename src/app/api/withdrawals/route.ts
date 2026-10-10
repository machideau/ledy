import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { withdrawSchema } from "@/lib/validation";
import { generateWithdrawalRef } from "@/lib/plans";
import type { ApiError, WithdrawalDTO } from "@/lib/types";

// GET /api/withdrawals — list current user's withdrawals
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const dto: WithdrawalDTO[] = withdrawals.map((w) => ({
    id: w.id,
    amount: w.amount,
    method: w.method as "flooz" | "tmoney",
    phone: w.phone,
    status: w.status as "pending" | "paid",
    type: w.type,
    ref: w.ref,
    createdAt: w.createdAt.toISOString(),
  }));

  return NextResponse.json({ withdrawals: dto });
}

// POST /api/withdrawals — create a withdrawal request
// #1 — the entire balance check + withdrawal creation runs inside a single
// Prisma transaction to prevent race conditions when two concurrent requests
// try to withdraw against the same balance.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = withdrawSchema.safeParse(body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return NextResponse.json<ApiError>({ error: msg }, { status: 400 });
  }

  const { method, phone, amount } = parsed.data;

  try {
    const withdrawal = await prisma.$transaction(async (tx) => {
      // ── Re-read all balance data inside the transaction ────────────────────
      const [investments, referrals, existingWithdrawals] = await Promise.all([
        tx.investment.findMany({ where: { userId: user.id } }),
        tx.referral.findMany({ where: { referrerId: user.id } }),
        tx.withdrawal.findMany({
          where: { userId: user.id, status: { in: ["pending", "paid"] } },
        }),
      ]);

      // Règle métier : l'utilisateur doit avoir pris au moins un investissement.
      if (investments.length === 0) {
        throw new Error("NEEDS_INVESTMENT");
      }

      const totalRemb = investments.reduce((s, i) => s + i.remb, 0);
      const completedGains = investments
        .filter((i) => i.status === "completed")
        .reduce((s, i) => s + i.gain, 0);
      const referralEarnings = referrals
        .filter((r) => r.status === "paid")
        .reduce((s, r) => s + r.commission, 0);

      const balance = totalRemb + completedGains + referralEarnings;
      const withdrawnAmount = existingWithdrawals.reduce((s, w) => s + w.amount, 0);
      const availableBalance = balance - withdrawnAmount;

      if (amount > availableBalance) {
        throw new Error(`INSUFFICIENT:${availableBalance}`);
      }

      return tx.withdrawal.create({
        data: {
          userId: user.id,
          amount,
          method,
          phone,
          status: "pending",
          type: "Retrait manuel",
          ref: generateWithdrawalRef(),
        },
      });
    });

    return NextResponse.json(
      {
        id: withdrawal.id,
        amount: withdrawal.amount,
        method: withdrawal.method,
        phone: withdrawal.phone,
        status: withdrawal.status,
        type: withdrawal.type,
        ref: withdrawal.ref,
        createdAt: withdrawal.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NEEDS_INVESTMENT") {
        return NextResponse.json<ApiError>(
          { error: "Vous devez avoir souscrit à au moins un plan d'investissement pour effectuer un retrait." },
          { status: 403 }
        );
      }
      if (err.message.startsWith("INSUFFICIENT:")) {
        const available = parseInt(err.message.split(":")[1], 10);
        return NextResponse.json<ApiError>(
          { error: `Solde insuffisant. Maximum : ${available.toLocaleString("fr-FR")} FCFA` },
          { status: 400 }
        );
      }
    }
    console.error("[withdrawals] POST error:", err);
    return NextResponse.json<ApiError>({ error: "Erreur serveur." }, { status: 500 });
  }
}
