import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

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

export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export const tokenMaxAge = TOKEN_MAX_AGE;
