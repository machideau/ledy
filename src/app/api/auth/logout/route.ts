import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, revokeToken } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Blacklist the token so it can't be reused even if extracted
  if (token) await revokeToken(token);

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
