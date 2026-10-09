import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/referrals?status=all|pending|paid&search=xxx&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search")?.trim() ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { referredPhone: { contains: search } },
      { referrer: { phone: { contains: search } } },
    ];
  }

  const [total, referrals, stats] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: { referrer: { select: { phone: true, name: true, referralCode: true } } },
    }),
    // Global referral stats regardless of filters
    prisma.referral.aggregate({
      _count: { id: true },
      _sum:   { commission: true },
    }),
  ]);

  const paidCount = await prisma.referral.count({ where: { status: "paid" } });

  const dto = referrals.map((r) => ({
    id:             r.id,
    referredPhone:  r.referredPhone,
    planName:       r.planName,
    amount:         r.amount,
    commission:     r.commission,
    status:         r.status,
    createdAt:      r.createdAt.toISOString(),
    referrer: {
      phone:        r.referrer.phone,
      name:         r.referrer.name,
      referralCode: r.referrer.referralCode,
    },
  }));

  return NextResponse.json({
    referrals: dto,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    globalStats: {
      total:          stats._count.id,
      paidCount,
      totalCommission: stats._sum.commission ?? 0,
      conversionRate: stats._count.id > 0 ? Math.round((paidCount / stats._count.id) * 100) : 0,
    },
  });
}
