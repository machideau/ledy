/**
 * Rate limiter backed by a KV store (Redis-compatible).
 *
 * Uses the native `fetch`-based Upstash REST API so it works in both
 * Node.js and Edge runtimes without extra npm packages.
 *
 * Required environment variables:
 *   UPSTASH_REDIS_REST_URL   — e.g. https://xxxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — Upstash REST token
 *
 * Falls back to an in-memory store when those variables are absent
 * (local dev, CI). The fallback is NOT safe for multi-process/serverless
 * production — configure Upstash before deploying.
 *
 * Algorithm: sliding-window via Redis INCR + EXPIRE.
 */

// ── Upstash helper ────────────────────────────────────────────────────────────

async function redisIncr(key: string, windowMs: number): Promise<number | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // fallback to in-memory

  const windowSec = Math.ceil(windowMs / 1000);

  try {
    // Pipeline: INCR key + EXPIRE key windowSec (only sets TTL if key is new)
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSec, "NX"],
      ]),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as [{ result: number }, unknown];
    return data[0].result;
  } catch {
    return null; // network error — fail open (do not block requests)
  }
}

// ── In-memory fallback (dev / CI only) ───────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms
}

const store = new Map<string, RateLimitEntry>();

function inMemoryIsRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequests;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the request should be blocked. */
export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const count = await redisIncr(key, windowMs);

  if (count === null) {
    // Upstash not configured — use in-memory fallback
    return inMemoryIsRateLimited(key, maxRequests, windowMs);
  }

  return count > maxRequests;
}
