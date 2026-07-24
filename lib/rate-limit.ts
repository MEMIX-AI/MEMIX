import { prisma } from "./prisma";

// DB-backed fixed-window rate limiter. Deploying to serverless (Vercel)
// means a request can land on a fresh process with no shared memory, so an
// in-memory Map (the earlier version of this file) silently stops
// enforcing limits — every cold start looks like a brand new caller. This
// version puts the counter in the same database everything else already
// uses, so it's consistent regardless of how many processes are running.
//
// The window start is baked into the bucket key itself, so a single atomic
// upsert-increment is enough — no separate read-compare-write step, so no
// race window between concurrent requests for the same key.
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const bucketKey = `${key}:${windowStart}`;

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key: bucketKey },
    create: { key: bucketKey, count: 1, resetAt: new Date(resetAt) },
    update: { count: { increment: 1 } },
  });

  // Opportunistic cleanup of past windows' rows so this table doesn't grow
  // forever — cheap to skip most of the time, doesn't need to be exact.
  if (Math.random() < 0.01) {
    prisma.rateLimitBucket
      .deleteMany({ where: { resetAt: { lt: new Date() } } })
      .catch(() => undefined);
  }

  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt,
  };
}
