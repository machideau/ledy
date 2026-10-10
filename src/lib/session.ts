import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { COOKIE_NAME, verifyToken } from "./auth";
import type { User } from "../generated/prisma/client";

// Used in Server Components / Route Handlers to get the current user.
// Returns null if not authenticated or if the account is suspended (#12).
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user) return null;

  // #12 — Suspended accounts are blocked at every authenticated request,
  // not just at login. A valid JWT doesn't bypass suspension.
  if (user.suspended) return null;

  return user;
}

// Throws if not authenticated — use in Route Handlers that require auth.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
