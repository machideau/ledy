import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TRANCHE_INTERVAL_DAYS } from "@/lib/plans";

// GET /api/cron/tick
// Called daily at 06:00 UTC by Vercel Cron (vercel.json).
//
// Gain model: 10 % per day × 30 days = 300 % of the deposit.
// Paid in 3 equal tranches every 10 days:
//   tranche 1 = amount  (credited at J+10)
//   tranche 2 = amount  (credited at J+20)
//   tranche 3 = amount  (credited at J+30, investment → completed)
//
// Each tranche is tracked by tranche1PaidAt / tranche2PaidAt / tranche3PaidAt.
// NULL means not yet paid. The cron sets them on the first tick that crosses
// the threshold (createdAt + N × TRANCHE_INTERVAL_DAYS).
// expiresAt == createdAt + 30 days is still used as the authoritative
// completion trigger (tranche 3).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const TRANCHE_MS = TRANCHE_INTERVAL_DAYS * MS_PER_DAY; // 10 days in ms

  // ── Fetch all active investments ──────────────────────────────────────────
  const activeInvestments = await prisma.investment.findMany({
    where:  { status: "active" },
    select: {
      id: true,
      userId: true,
      amount: true,
      gain: true,
      createdAt: true,
      expiresAt: true,
      tranche1PaidAt: true,
      tranche2PaidAt: true,
      tranche3PaidAt: true,
    },
  });

  // Accumulate balance increments per user to batch updates
  const balanceByUser = new Map<string, number>();
  const addBalance = (userId: string, amount: number) =>
    balanceByUser.set(userId, (balanceByUser.get(userId) ?? 0) + amount);

  // Track which investments need which updates
  const updates: Array<{
    id: string;
    data: {
      tranche1PaidAt?: Date;
      tranche2PaidAt?: Date;
      tranche3PaidAt?: Date;
      status?: "completed";
      daysLeft?: number;
    };
    trancheAmount: number;   // total new balance to credit for this investment this tick
    userId: string;
  }> = [];

  for (const inv of activeInvestments) {
    const elapsedMs  = now.getTime() - inv.createdAt.getTime();
    const tranche    = Math.floor(inv.gain / 3); // = inv.amount exactly
    const data: typeof updates[number]["data"] = {};
    let credit = 0;

    // ── Tranche 1: J+10 ────────────────────────────────────────────────────
    if (!inv.tranche1PaidAt && elapsedMs >= TRANCHE_MS) {
      data.tranche1PaidAt = now;
      credit += tranche;
    }

    // ── Tranche 2: J+20 ────────────────────────────────────────────────────
    if (!inv.tranche2PaidAt && elapsedMs >= 2 * TRANCHE_MS) {
      data.tranche2PaidAt = now;
      credit += tranche;
    }

    // ── Tranche 3: J+30 — also completes the investment ───────────────────
    if (!inv.tranche3PaidAt && now >= inv.expiresAt) {
      data.tranche3PaidAt = now;
      data.status   = "completed";
      data.daysLeft = 0;
      credit += tranche;
    }

    if (credit > 0) {
      updates.push({ id: inv.id, data, trancheAmount: credit, userId: inv.userId });
      addBalance(inv.userId, credit);
    }
  }

  // ── Apply investment updates (one per investment that changed) ────────────
  await Promise.all(updates.map(({ id, data }) =>
    prisma.investment.update({ where: { id }, data })
  ));

  // ── Apply balance increments (one per user) ───────────────────────────────
  await Promise.all(
    Array.from(balanceByUser.entries()).map(([userId, amount]) =>
      prisma.user.update({
        where: { id: userId },
        data:  { balance: { increment: amount } },
      })
    )
  );

  // ── Refresh daysLeft for still-active investments (display only) ──────────
  const stillActive = activeInvestments.filter(inv => {
    const updated = updates.find(u => u.id === inv.id);
    return !updated?.data.status; // not completed this tick
  });

  const buckets = new Map<number, string[]>();
  for (const inv of stillActive) {
    const msLeft   = inv.expiresAt.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(msLeft / MS_PER_DAY));
    if (!buckets.has(daysLeft)) buckets.set(daysLeft, []);
    buckets.get(daysLeft)!.push(inv.id);
  }

  await Promise.all(
    Array.from(buckets.entries()).map(([daysLeft, ids]) =>
      prisma.investment.updateMany({
        where: { id: { in: ids } },
        data:  { daysLeft },
      })
    )
  );

  // ── Purge expired revoked tokens ──────────────────────────────────────────
  const { count: purgedTokens } = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  const tranchePaid = updates.length;
  const completed   = updates.filter(u => u.data.status === "completed").length;

  return NextResponse.json({
    tranchePaid,
    completed,
    stillActive: stillActive.length,
    daysLeftBuckets: buckets.size,
    purgedTokens,
    timestamp: now.toISOString(),
  });
}
