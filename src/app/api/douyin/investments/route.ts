import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import { logAdminAction } from "@/lib/adminLog";
import { PLAN_BY_NAME } from "@/lib/plans";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/investments?status=all|active|completed&plan=xxx&search=xxx&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "all";
  const plan   = searchParams.get("plan")   ?? "all";
  const search = searchParams.get("search")?.trim() ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status   = status;
  if (plan   !== "all") where.planName = plan;
  if (search) where.user = { phone: { contains: search } };

  const [total, investments] = await Promise.all([
    prisma.investment.count({ where }),
    prisma.investment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: { user: { select: { phone: true, name: true } } },
    }),
  ]);

  const now = new Date();
  const dto = investments.map((inv) => {
    const msLeft   = inv.expiresAt.getTime() - now.getTime();
    const daysLeft = inv.status === "completed" ? 0 : Math.max(0, Math.ceil(msLeft / 86400_000));
    return {
      id:        inv.id,
      planName:  inv.planName,
      amount:    inv.amount,
      remb:      inv.remb,
      gain:      inv.gain,
      status:    inv.status,
      daysLeft,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      user: { phone: inv.user.phone, name: inv.user.name },
    };
  });

  return NextResponse.json({
    investments: dto,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// PATCH /api/douyin/investments
// Two actions via the `action` discriminator:
//   { action: "complete", id }           — mark investment as completed
//   { action: "changePlan", id, planName } — change the plan (amount/remb/gain)
export async function PATCH(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireDouyin>>;
  try {
    admin = await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { id, action, planName } = body as {
    id?: string;
    action?: string;
    planName?: string;
  };

  if (!id) return NextResponse.json<ApiError>({ error: "id requis." }, { status: 400 });

  const inv = await prisma.investment.findUnique({
    where: { id },
    select: { status: true, planName: true, amount: true, userId: true },
  });
  if (!inv) return NextResponse.json<ApiError>({ error: "Investissement introuvable." }, { status: 404 });

  // ── Action: compléter ──────────────────────────────────────────────────────
  if (action === "complete" || !action) {
    if (inv.status !== "active") {
      return NextResponse.json<ApiError>({ error: "Cet investissement est déjà terminé." }, { status: 409 });
    }

    const updated = await prisma.investment.update({
      where: { id },
      data: { status: "completed", daysLeft: 0 },
    });

    await logAdminAction({
      adminId: admin.id,
      action: "investment.complete",
      targetId: id,
      targetType: "investment",
      meta: { planName: inv.planName, amount: inv.amount },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  // ── Action: changer le plan ────────────────────────────────────────────────
  if (action === "changePlan") {
    if (!planName) {
      return NextResponse.json<ApiError>({ error: "planName requis." }, { status: 400 });
    }

    const plan = PLAN_BY_NAME[planName];
    if (!plan) {
      return NextResponse.json<ApiError>(
        { error: `Plan invalide. Valeurs acceptées : ${Object.keys(PLAN_BY_NAME).join(", ")}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        planName: plan.name,
        amount:   plan.amount,
        remb:     plan.remb,
        gain:     plan.gain,
      },
    });

    await logAdminAction({
      adminId: admin.id,
      action: "investment.changePlan",
      targetId: id,
      targetType: "investment",
      meta: {
        from: inv.planName,
        to:   plan.name,
        oldAmount: inv.amount,
        newAmount: plan.amount,
      },
    });

    return NextResponse.json({
      id:       updated.id,
      planName: updated.planName,
      amount:   updated.amount,
      remb:     updated.remb,
      gain:     updated.gain,
    });
  }

  return NextResponse.json<ApiError>({ error: "Action invalide." }, { status: 400 });
}
