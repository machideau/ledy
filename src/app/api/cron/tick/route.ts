import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/tick
// Called daily at 06:00 UTC by Vercel Cron (vercel.json).
//
// Uses expiresAt (exact timestamp) to determine completion.
// daysLeft is kept in sync for display purposes.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const activeInvestments = await prisma.investment.findMany({
    where: { status: "active" },
    select: { id: true, expiresAt: true },
  });

  if (activeInvestments.length === 0) {
    return NextResponse.json({ processed: 0, completed: 0 });
  }

  const completed = activeInvestments.filter((inv) => inv.expiresAt <= now);
  const running   = activeInvestments.filter((inv) => inv.expiresAt > now);

  // Mark expired investments as completed
  if (completed.length > 0) {
    await prisma.investment.updateMany({
      where: { id: { in: completed.map((inv) => inv.id) } },
      data: { status: "completed", daysLeft: 0 },
    });

    // ── Disbursement (manual for now) ────────────────────────────────────────
    // Gains are recorded as virtual wallet balance and users must request a
    // withdrawal via /withdraw.  Admins process payouts in the /douyin panel.
    //
    // When Tchin supports server-initiated transfers (payout API), replace this
    // block with an automated call per completed investment:
    //   for (const inv of completed) {
    //     await tchinPayout({ userId: inv.userId, amount: inv.gain, … });
    //   }
    // ──────────────────────────────────────────────────────────────────────────
  }

  // Refresh daysLeft for still-running investments
  for (const inv of running) {
    const msLeft   = inv.expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    await prisma.investment.update({
      where: { id: inv.id },
      data: { daysLeft },
    });
  }

  // Purge expired revoked tokens (they're useless once the JWT itself is expired)
  const { count: purgedTokens } = await prisma.revokedToken.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  return NextResponse.json({
    processed: activeInvestments.length,
    completed: completed.length,
    decremented: running.length,
    purgedTokens,
    timestamp: now.toISOString(),
  });
}
