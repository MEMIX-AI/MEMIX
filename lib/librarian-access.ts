import { prisma } from "./prisma";
import { getMixBalance } from "./mix-token";

export type LibrarianTier = "FREE" | "HOLDER";

const DEFAULTS = {
  MIN_MIX_HOLD: 250_000,
  FREE_DAILY_QUOTA: 1,
  HOLDER_DAILY_QUOTA: 10,
  GLOBAL_DAILY_CAP: 50,
};

function intEnv(name: keyof typeof DEFAULTS): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULTS[name];
}

// Master switch (default OFF) — everything else in this module still
// works/is testable regardless, but the public route checks this first
// and refuses all public access while it's false. Admin-triggered verdict
// generation (app/api/admin/...) never reads this flag at all.
export function isLibrarianPublicEnabled(): boolean {
  return process.env.LIBRARIAN_PUBLIC_ENABLED === "true";
}

export function minMixHold(): number {
  return intEnv("MIN_MIX_HOLD");
}

export function quotaForTier(tier: LibrarianTier): number {
  return tier === "HOLDER" ? intEnv("HOLDER_DAILY_QUOTA") : intEnv("FREE_DAILY_QUOTA");
}

export function globalDailyCap(): number {
  return intEnv("GLOBAL_DAILY_CAP");
}

// A failed/unreadable balance is FREE, never HOLDER — "jangan kasih akses
// lebih dari yang kebukti" (never grant more access than what's actually
// proven on-chain).
export async function getWalletTier(
  walletAddress: string,
): Promise<{ tier: LibrarianTier; balance: number | null }> {
  const balance = await getMixBalance(walletAddress);
  if (balance === null) return { tier: "FREE", balance: null };
  return { tier: balance >= minMixHold() ? "HOLDER" : "FREE", balance };
}

function todayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Both counted from real LibrarianPublicUsageLog rows since UTC
// midnight — never estimated/assumed. See that model's schema comment
// for exactly which outcomes get logged (only real, credit-spending LLM
// attempts).
export async function globalUsageToday(): Promise<number> {
  return prisma.librarianPublicUsageLog.count({ where: { createdAt: { gte: todayStartUTC() } } });
}

export async function walletUsageToday(walletAddress: string): Promise<number> {
  return prisma.librarianPublicUsageLog.count({
    where: { walletAddress: walletAddress.toLowerCase(), createdAt: { gte: todayStartUTC() } },
  });
}
