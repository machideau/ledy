import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/investments — all investments with user info
export async function GET() {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const investments = await prisma.investment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true, name: true } },
    },
  });

  const dto = investments.map((inv) => ({
    id: inv.id,
    planName: inv.planName,
    amount: inv.amount,
    remb: inv.remb,
    gain: inv.gain,
    status: inv.status,
    daysLeft: inv.daysLeft,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    user: {
      phone: inv.user.phone,
      name: inv.user.name,
    },
  }));

  return NextResponse.json({ investments: dto });
}
