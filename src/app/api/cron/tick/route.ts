import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/tick
// Called daily at 06:00 UTC by Vercel Cron (vercel.json).
//
// Uses expiresAt (exact timestamp) to determine completion.
// daysLeft is kept in sync for display purposes.
//
// #7 — replaced the N+1 per-investment update loop with a single updateMany
// for completed investments and a single updateMany per distinct daysLeft bucket
// using raw SQL for the still-running ones.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── Step 1: mark expired investments as completed in one query ────────────
  const { count: completedCount } = await prisma.investment.updateMany({
    where: { status: "active", expiresAt: { lte: now } },
    data:  { status: "completed", daysLeft: 0 },
  });

  // #9 — credit the gain to each user's denormalised balance for completed investments
  if (completedCount > 0) {
    const justCompleted = await prisma.investment.findMany({
      where: { status: "completed", expiresAt: { lte: now } },
      select: { userId: true, gain: true },
    });

    // Group gain by userId so we do one update per user, not per investment
    const gainByUser = new Map<string, number>();
    for (const inv of justCompleted) {
      gainByUser.set(inv.userId, (gainByUser.get(inv.userId) ?? 0) + inv.gain);
    }

    await Promise.all(
      Array.from(gainByUser.entries()).map(([userId, gain]) =>
        prisma.user.update({
          where: { id: userId },
          data:  { balance: { increment: gain } },
        })
      )
    );
  }

  // ── Step 2: refresh daysLeft for still-running investments ────────────────
  // Fetch only the ids + expiresAt of still-active investments, then group by
  // daysLeft value so we can batch-update per bucket instead of one query each.
  const running = await prisma.investment.findMany({
    where:  { status: "active" },
    select: { id: true, expiresAt: true },
  });

  // Group ids by computed daysLeft value
  const buckets = new Map<number, string[]>();
  for (const inv of running) {
    const msLeft   = inv.expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    const key = Math.max(0, daysLeft);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(inv.id);
  }

  // One updateMany per unique daysLeft value (typically ~30 buckets max)
  await Promise.all(
    Array.from(buckets.entries()).map(([daysLeft, ids]) =>
      prisma.investment.updateMany({
        where: { id: { in: ids } },
        data:  { daysLeft },
      })
    )
  );

  // ── Step 3: purge expired revoked tokens ──────────────────────────────────
  const { count: purgedTokens } = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  // ── Disbursement note ─────────────────────────────────────────────────────
  // Gains are recorded as virtual wallet balance and users must request a
  // withdrawal via /withdraw.  Admins process payouts in the /douyin panel.
  //
  // When Tchin supports server-initiated transfers (payout API), replace this
  // block with an automated call per completed investment.
  // ──────────────────────────────────────────────────────────────────────────

  return NextResponse.json({
    processed: running.length + completedCount,
    completed: completedCount,
    decremented: running.length,
    daysLeftBuckets: buckets.size,
    purgedTokens,
    timestamp: now.toISOString(),
  });
}
