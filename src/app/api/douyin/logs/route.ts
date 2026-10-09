import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/logs?page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  const [total, logs] = await Promise.all([
    prisma.adminLog.count(),
    // Don't use include — targetId may point to non-User records (withdrawals, investments)
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  // Resolve admin phone separately
  const adminIds = [...new Set(logs.map(l => l.adminId))];
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, phone: true, name: true },
  });
  const adminMap = Object.fromEntries(admins.map(a => [a.id, a]));

  // Resolve target phone only when targetType === "user"
  const userTargetIds = logs
    .filter(l => l.targetType === "user" && l.targetId)
    .map(l => l.targetId as string);
  const targetUsers = userTargetIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userTargetIds } },
        select: { id: true, phone: true, name: true },
      })
    : [];
  const targetMap = Object.fromEntries(targetUsers.map(u => [u.id, u]));

  const dto = logs.map((l) => ({
    id:         l.id,
    action:     l.action,
    targetId:   l.targetId,
    targetType: l.targetType,
    meta:       l.meta ? (() => { try { return JSON.parse(l.meta!); } catch { return null; } })() : null,
    createdAt:  l.createdAt.toISOString(),
    admin: adminMap[l.adminId]
      ? { phone: adminMap[l.adminId].phone, name: adminMap[l.adminId].name }
      : { phone: l.adminId, name: null },
    target: l.targetType === "user" && l.targetId && targetMap[l.targetId]
      ? { phone: targetMap[l.targetId].phone, name: targetMap[l.targetId].name }
      : null,
  }));

  return NextResponse.json({
    logs: dto,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
