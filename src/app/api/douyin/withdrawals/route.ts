import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDouyin } from "@/lib/douyin";
import type { ApiError } from "@/lib/types";

// GET /api/douyin/withdrawals — all withdrawals with user info
export async function GET() {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const withdrawals = await prisma.withdrawal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true, name: true } },
    },
  });

  const dto = withdrawals.map((w) => ({
    id: w.id,
    amount: w.amount,
    method: w.method,
    phone: w.phone,
    status: w.status,
    type: w.type,
    ref: w.ref,
    createdAt: w.createdAt.toISOString(),
    user: {
      phone: w.user.phone,
      name: w.user.name,
    },
  }));

  return NextResponse.json({ withdrawals: dto });
}

// PATCH /api/douyin/withdrawals — mark a withdrawal as paid or cancelled
export async function PATCH(request: NextRequest) {
  try {
    await requireDouyin();
  } catch {
    return NextResponse.json<ApiError>({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !["paid", "cancelled"].includes(status ?? "")) {
    return NextResponse.json<ApiError>(
      { error: "id et status (paid|cancelled) requis." },
      { status: 400 }
    );
  }

  const updated = await prisma.withdrawal.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
