/**
 * Simple in-memory rate limiter.
 *
 * Works for single-process deployments (Vercel serverless functions share
 * nothing between instances, so this limits bursts within one lambda warm
 * instance — good enough to deter scripted brute-force against a specific
 * target phone number hitting the same instance repeatedly).
 *
 * For stronger protection across all instances, replace the Map with an
 * atomic counter in Redis / Upstash:
 *   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // unix ms
}

const store = new Map<string, RateLimitEntry>();

/** Returns true if the request should be blocked. */
export function isRateLimited(
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
  if (entry.count > maxRequests) return true;

  return false;
}
