import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { ApiError } from "@/lib/types";

// GET /api/tchin/status?token=xxx
// Polls the status of a pending Tchin payment.
// The client polls this after redirecting back from the Tchin payment page.
export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json<ApiError>({ error: "Token manquant." }, { status: 400 });
  }

  const pending = await prisma.pendingPayment.findUnique({
    where: { tchinToken: token },
  });

  if (!pending || pending.userId !== user.id) {
    return NextResponse.json<ApiError>({ error: "Paiement introuvable." }, { status: 404 });
  }

  return NextResponse.json({ status: pending.status, token });
}
