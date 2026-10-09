import { getCurrentUser } from "./session";
import type { User } from "../generated/prisma/client";

// ── Admin role ("douyin") ──────────────────────────────────────────────────────
// The admin role and all admin routes are named "douyin" throughout the codebase.
// This is intentional obfuscation: the admin section is hidden from casual
// inspection without being behind a separate subdomain or path prefix that
// screams "admin".
//
// When reading the code, mentally substitute "douyin" ↔ "admin":
//   role === "douyin"   →  is admin
//   /api/douyin/*       →  admin API
//   /douyin             →  admin dashboard
//
// To promote a user to admin, run: npx tsx scripts/make-admin.ts <phone>
// ─────────────────────────────────────────────────────────────────────────────

// Returns the current user if they have the "douyin" (admin) role, null otherwise.
export async function getDouyinUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "douyin") return null;
  return user;
}

// Throws if not authenticated or not admin.
export async function requireDouyin(): Promise<User> {
  const user = await getDouyinUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
