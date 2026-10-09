import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import type { UserPublic, ApiError } from "@/lib/types";

// Returns the current authenticated user's public profile.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ApiError>({ error: "Non authentifié." }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    phone: user.phone,
    name: user.name,
    referralCode: user.referralCode,
    role: user.role,
  } satisfies UserPublic & { role: string });
}
