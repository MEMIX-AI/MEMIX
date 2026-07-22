import type { NextRequest } from "next/server";
import type { ApiKeyTier } from "@prisma/client";
import { prisma } from "./prisma";
import { hashApiKey } from "./api-key";
import { checkRateLimit } from "./rate-limit";

// Per-tier daily request budget. Paid tiers are TODO — see CLAUDE.md
// "manusia gratis, mesin bayar" and /docs/acp-plan.md for what comes next.
const TIER_DAILY_LIMIT: Record<ApiKeyTier, number> = {
  FREE_DEV: 100,
};
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

export type ApiAuthResult =
  | { ok: true; apiKeyId: string; tier: ApiKeyTier }
  | { ok: false; status: number; error: string };

function extractKey(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

  const header = req.headers.get("x-api-key");
  if (header) return header.trim();

  return null;
}

/**
 * The auth+rate-limit layer for /api/v1/*. Not implemented as Next.js
 * middleware.ts — that runs on the Edge runtime, and this needs a Prisma
 * lookup (same constraint documented on the admin-panel middleware: Edge
 * can't touch SQLite). Call this as the first line of every v1 route
 * handler instead — same "Node-runtime check backs the Edge-incompatible
 * check" pattern used everywhere else in this project.
 *
 * The daily cap itself is enforced by the in-memory limiter (see
 * lib/rate-limit.ts) — `ApiKey.requestCount` is a separate, durable
 * lifetime counter for display/analytics, not what blocks a request.
 */
export async function authenticateApiRequest(req: NextRequest): Promise<ApiAuthResult> {
  const key = extractKey(req);
  if (!key) {
    return {
      ok: false,
      status: 401,
      error: "missing API key — pass it as `Authorization: Bearer <key>` or `X-API-Key: <key>`",
    };
  }

  const record = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(key) } });
  if (!record) {
    return { ok: false, status: 401, error: "invalid API key" };
  }

  const limit = TIER_DAILY_LIMIT[record.tier];
  const rateLimit = checkRateLimit(`apikey:${record.id}`, limit, RATE_WINDOW_MS);
  if (!rateLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: `rate limit reached for tier ${record.tier} (${limit} requests/day)`,
    };
  }

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
  });

  return { ok: true, apiKeyId: record.id, tier: record.tier };
}
