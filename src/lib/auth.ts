import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "[auth] JWT_SECRET is not set. Add it to your environment variables before starting the server."
  );
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Token lifetime: 7 days
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // seconds

export const COOKIE_NAME = "leed-session";

// ── Password hashing ──────────────────────────
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT ────────────────────────────────────────

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(secret);
}

/**
 * Verifies a JWT cryptographically only — no database check.
 * Used by the middleware (Edge Runtime) where Prisma is unavailable.
 */
export async function verifyTokenEdge(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Verifies a JWT and checks it hasn't been revoked.
 * Returns null if the token is invalid, expired, or was explicitly revoked (logout).
 * Only use in Node.js route handlers — requires Prisma (not Edge-compatible).
 */
export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;

    // Check blacklist
    const revoked = await prisma.revokedToken.findUnique({ where: { token } });
    if (revoked) return null;

    return { sub: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Revokes a token immediately (real logout).
 * The record is kept until the token's natural expiry, then can be cleaned up.
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const expiresAt = payload.exp
      ? new Date(payload.exp * 1000)
      : new Date(Date.now() + TOKEN_MAX_AGE * 1000);

    await prisma.revokedToken.upsert({
      where:  { token },
      update: {},
      create: { token, expiresAt },
    });
  } catch {
    // If the token is already invalid, nothing to revoke
  }
}

export const tokenMaxAge = TOKEN_MAX_AGE;
