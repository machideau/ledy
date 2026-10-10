import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import { logAdminAction } from "@/lib/adminLog";
import { adminNoteSchema } from "@/lib/validation";
import { $Enums } from "@/generated/prisma/client";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/withdrawals?status=all|pending|paid|cancelled&sort=date|amount&dir=asc|desc&page=1&limit=50&search=xxx
export async function GET(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "all";
  const sort   = searchParams.get("sort")   ?? "date";
  const dir    = (searchParams.get("dir") ?? "desc") === "asc" ? "asc" : "desc";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const search = searchParams.get("search")?.trim() ?? "";

  const statusWhere = status !== "all"
    ? { status: status as $Enums.WithdrawalStatus }
    : {};
  const searchWhere = search
    ? {
        OR: [
          { ref:   { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { user:  { phone: { contains: search } } },
        ],
      }
    : {};

  const where = { ...statusWhere, ...searchWhere };
  const orderBy = sort === "amount"
    ? { amount: dir as "asc" | "desc" }
    : { createdAt: dir as "asc" | "desc" };

  const [total, withdrawals] = await Promise.all([
    prisma.withdrawal.count({ where }),
    prisma.withdrawal.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { phone: true, name: true } } },
    }),
  ]);

  const dto = withdrawals.map((w) => ({
    id:        w.id,
    amount:    w.amount,
    method:    w.method,
    phone:     w.phone,
    status:    w.status,
    type:      w.type,
    ref:       w.ref,
    note:      w.note,
    createdAt: w.createdAt.toISOString(),
    user: { phone: w.user.phone, name: w.user.name },
  }));

  return NextResponse.json({
    withdrawals: dto,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// PATCH /api/douyin/withdrawals — mark paid or cancelled (with optional note)
export async function PATCH(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireDouyin>>;
  try {
    admin = await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { id, status, note } = body as { id?: string; status?: string; note?: string };

  if (!id || !["paid", "cancelled"].includes(status ?? "")) {
    return NextResponse.json<ApiError>(
      { error: "id et status (paid|cancelled) requis." },
      { status: 400 }
    );
  }
  const typedStatus = status as $Enums.WithdrawalStatus;

  // #5 — validate note length
  const noteParsed = adminNoteSchema.safeParse(note);
  if (!noteParsed.success) {
    return NextResponse.json<ApiError>(
      { error: noteParsed.error.issues[0]?.message || "Note invalide." },
      { status: 400 }
    );
  }
  const validatedNote = noteParsed.data;

  const wd = await prisma.withdrawal.findUnique({
    where: { id },
    select: { status: true, amount: true, userId: true },
  });
  if (!wd) return NextResponse.json<ApiError>({ error: "Retrait introuvable." }, { status: 404 });
  if (wd.status !== "pending") {
    return NextResponse.json<ApiError>({ error: "Ce retrait a déjà été traité." }, { status: 409 });
  }

  // fetch user phone separately for the audit log
  const wdUser = await prisma.user.findUnique({ where: { id: wd.userId }, select: { phone: true } });

  const updated = await prisma.withdrawal.update({
    where: { id },
    data: {
      status: typedStatus,
      ...(validatedNote !== undefined ? { note: validatedNote || null } : {}),
    },
  });

  // #9 — when a withdrawal is paid, decrement the user's denormalised balance
  if (typedStatus === "paid") {
    await prisma.user.update({
      where: { id: wd.userId },
      data:  { balance: { decrement: wd.amount } },
    }).catch(() => { /* non-critical — dashboard re-derives balance on read */ });
  }

  const action = typedStatus === "paid" ? "withdrawal.paid" : "withdrawal.cancelled";
  await logAdminAction({
    adminId: admin.id,
    action,
    targetId: id,
    targetType: "withdrawal",
    meta: { amount: wd.amount, userPhone: wdUser?.phone ?? "unknown", note: validatedNote ?? null },
  });

  return NextResponse.json({ id: updated.id, status: updated.status, note: updated.note });
}
