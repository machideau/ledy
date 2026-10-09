import { getCurrentUser } from "./session";
import type { User } from "../generated/prisma/client";

// Returns the current user if they have the "douyin" role, null otherwise.
export async function getDouyinUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "douyin") return null;
  return user;
}

// Throws if not authenticated or not douyin.
export async function requireDouyin(): Promise<User> {
  const user = await getDouyinUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
