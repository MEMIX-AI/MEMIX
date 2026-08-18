import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

const MAX_USERNAME_LENGTH = 40;
const MAX_X_HANDLE_LENGTH = 30;
const MAX_DISCORD_HANDLE_LENGTH = 40;
const MAX_BIO_LENGTH = 280;

export async function getProfile(walletAddress: string) {
  return prisma.user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
}

// Every upload this wallet has ever made that's currently PUBLIC + ACTIVE
// — the same filter the grid below uses, so the numbers shown in the
// stats row can never disagree with what's actually visible under them.
// Deliberately excludes drafts/unlisted/private/taken-down: a profile is
// a public directory page, and neither the count nor the aggregates
// should leak the existence of an asset nobody but the owner can reach.
export async function getProfileAssets(walletAddress: string) {
  return prisma.asset.findMany({
    where: { uploaderWallet: walletAddress.toLowerCase(), ...publicAssetWhere },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });
}

// Real confirmed purchases by this wallet, newest first, deduped to one row
// per asset (a repeat purchase of the same asset only shows once — the
// point is "what do they own," not a transaction log). Deliberately does
// NOT apply publicAssetWhere the way getProfileAssets does: once bought,
// access persists even if the seller later unlists/takes the asset down
// (same precedent as the download route's own "already purchased" check),
// so an owned asset stays visible here regardless of its current listing
// state.
export async function getPurchasedAssets(walletAddress: string) {
  const wallet = walletAddress.toLowerCase();
  const purchases = await prisma.marketplacePurchase.findMany({
    where: { buyerWallet: wallet, status: "CONFIRMED" },
    include: { listing: { include: { asset: { include: { tags: true } } } } },
    orderBy: { confirmedAt: "desc" },
  });
  return purchases
    .filter((p, i, arr) => arr.findIndex((x) => x.assetId === p.assetId) === i)
    .map((p) => p.listing.asset);
}

export interface ProfileUpdateInput {
  username?: string | null;
  avatarUrl?: string | null;
  xHandle?: string | null;
  discordHandle?: string | null;
  websiteUrl?: string | null;
  bio?: string | null;
}

export type ProfileUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

// Pure validation, shared by the PATCH route — kept here rather than
// inline in the route so the "no claim without receipt"-adjacent rule
// (an @-prefixed handle stored without its @, trimmed/length-capped text
// everywhere) has one definition instead of being re-derived per caller.
export function validateProfileUpdate(input: ProfileUpdateInput): ProfileUpdateResult {
  if (input.username != null && input.username.length > MAX_USERNAME_LENGTH) {
    return { ok: false, error: `display name is too long (max ${MAX_USERNAME_LENGTH} characters)` };
  }
  if (input.xHandle != null && input.xHandle.length > MAX_X_HANDLE_LENGTH) {
    return { ok: false, error: `X handle is too long (max ${MAX_X_HANDLE_LENGTH} characters)` };
  }
  if (input.discordHandle != null && input.discordHandle.length > MAX_DISCORD_HANDLE_LENGTH) {
    return { ok: false, error: `Discord handle is too long (max ${MAX_DISCORD_HANDLE_LENGTH} characters)` };
  }
  if (input.websiteUrl && !/^https?:\/\//.test(input.websiteUrl)) {
    return { ok: false, error: "website must be a real link starting with http:// or https://" };
  }
  if (input.bio != null && input.bio.length > MAX_BIO_LENGTH) {
    return { ok: false, error: `bio is too long (max ${MAX_BIO_LENGTH} characters)` };
  }
  // Only a real external link is accepted from free text. avatarUrl also
  // holds our OWN storage keys (bare strings like "avatars/<uuid>.webp",
  // set only by the server-side upload branch in app/api/profile/route.ts)
  // which lib/asset-urls.ts#isStorageKey resolves into a signed URL on
  // every read — including from the public GET /api/profile/[wallet]
  // route. Without this check, pasting any bare string here (e.g. a
  // storage key copied from a takedown'd or private asset's old signed
  // URL) would make this endpoint mint a live signed URL for it, bypassing
  // that asset's real visibility/takedown state entirely. A user-typed
  // value must never be storage-key-shaped.
  if (input.avatarUrl && !/^https?:\/\//.test(input.avatarUrl)) {
    return { ok: false, error: "avatar URL must be a real link starting with http:// or https://" };
  }
  return { ok: true };
}

// Normalizes the handle so it never carries a leading "@" in storage —
// the "@" is a display-only prefix (see components/EditProfileModal.tsx),
// stored input could otherwise end up double-prefixed or missing it
// depending on what a client happened to send.
export function normalizeXHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@+/, "");
  return trimmed || null;
}

export async function updateProfile(walletAddress: string, input: ProfileUpdateInput) {
  return prisma.user.update({
    where: { walletAddress: walletAddress.toLowerCase() },
    data: {
      ...(input.username !== undefined && { username: input.username?.trim() || null }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
      ...(input.xHandle !== undefined && { xHandle: normalizeXHandle(input.xHandle) }),
      ...(input.discordHandle !== undefined && { discordHandle: input.discordHandle?.trim() || null }),
      ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl?.trim() || null }),
      ...(input.bio !== undefined && { bio: input.bio?.trim() || null }),
    },
  });
}

// Single-wallet version of lib/creators.ts's aggregate — same real
// sources (works/downloads/views/likes from Asset, sales/earnings from
// CONFIRMED MarketplacePurchase, followers from Follow), just scoped to
// the one profile being rendered instead of the whole directory. This is
// the one stats source for /u/[wallet]'s 6-tile header bar — it used to
// be split across this function and the now-deleted getProfileStats()
// (unused, its two numbers are the downloads/likes sums below).
export interface CreatorStats {
  works: number;
  downloads: number;
  views: number;
  likes: number;
  followers: number;
  sales: number;
  earnedMix: number;
}

export async function getCreatorStats(walletAddress: string): Promise<CreatorStats> {
  const wallet = walletAddress.toLowerCase();
  const [assetAgg, followers, salesAgg] = await Promise.all([
    prisma.asset.aggregate({
      where: { uploaderWallet: wallet, ...publicAssetWhere },
      _count: { _all: true },
      _sum: { downloadCount: true, viewCount: true, likeCount: true },
    }),
    prisma.follow.count({ where: { followingWallet: wallet } }),
    prisma.marketplacePurchase.aggregate({
      where: { sellerWallet: wallet, status: "CONFIRMED" },
      _count: { _all: true },
      _sum: { sellerAmountMix: true },
    }),
  ]);
  return {
    works: assetAgg._count._all,
    downloads: assetAgg._sum.downloadCount ?? 0,
    views: assetAgg._sum.viewCount ?? 0,
    likes: assetAgg._sum.likeCount ?? 0,
    followers,
    sales: salesAgg._count._all,
    earnedMix: salesAgg._sum.sellerAmountMix ?? 0,
  };
}

// Real per-type breakdown of a creator's own public works, as percentages
// of their total — the sidebar's "Top Categories" card. Only IMAGE/VIDEO/
// SOUND exist as real Asset types (see prisma/schema.prisma's AssetType);
// no fabricated GIF/Other slice the way a "meme culture" mock might show
// one — same reasoning already applied to /creators's category tiles.
// Omits any type with zero of this creator's works instead of padding a
// 0% row, and returns [] entirely for a creator with no public works yet
// (the sidebar hides the card rather than rendering an empty chart).
export interface CategoryBreakdownEntry {
  type: "IMAGE" | "VIDEO" | "SOUND";
  count: number;
  percent: number;
}

export async function getCreatorCategoryBreakdown(walletAddress: string): Promise<CategoryBreakdownEntry[]> {
  const wallet = walletAddress.toLowerCase();
  const byType = await prisma.asset.groupBy({
    by: ["type"],
    where: { uploaderWallet: wallet, ...publicAssetWhere },
    _count: { _all: true },
  });
  const total = byType.reduce((sum, t) => sum + t._count._all, 0);
  if (total === 0) return [];

  return byType
    .map((t) => ({ type: t.type, count: t._count._all, percent: Math.round((t._count._all / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

// Creator Analytics (app/u/[wallet]/page.tsx sidebar) — real daily Views/
// Downloads/Earnings history, computed live from event tables at read time
// (no snapshot/cron job). Downloads (DownloadEvent) and Earnings
// (MarketplacePurchase) already had real per-event history before this
// existed; Views needed a new append-only table (AssetViewEvent, written
// alongside the existing dedupe upsert in app/api/assets/[id]/view/
// route.ts) since AssetViewer only ever keeps the latest view per (asset,
// IP) and can't answer "how many on day N".
const ANALYTICS_WINDOW_DAYS = 30;
// A 2-3 day comparison isn't a "trend" — require at least this many real
// days of history (so each half of the split has >= 7) before showing a
// percentage at all.
const MIN_DAYS_FOR_TREND = 14;

export interface DailyPoint {
  date: string; // YYYY-MM-DD, UTC
  value: number;
}

export interface DailyMetricSeries {
  points: DailyPoint[];
  total: number;
  changePercent: number | null;
  earliestDate: string | null;
}

export interface CreatorAnalytics {
  views: DailyMetricSeries;
  downloads: DailyMetricSeries;
  earnings: DailyMetricSeries;
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Plots only from the earliest REAL row found through today — never padded
// backward before that (a day with no rows before tracking existed is
// "unknown", not "zero"). Once there's at least one real row, every day
// after it genuinely was being logged, so a quiet day in that range is a
// real, honest zero, not a gap — see prisma/schema.prisma's AssetViewEvent
// doc comment for why this distinction matters.
function bucketDaily(rows: { day: string; value: number }[]): DailyMetricSeries {
  if (rows.length === 0) {
    return { points: [], total: 0, changePercent: null, earliestDate: null };
  }

  const sums = new Map<string, number>();
  for (const r of rows) sums.set(r.day, (sums.get(r.day) ?? 0) + r.value);

  const earliestDate = rows.reduce((min, r) => (r.day < min ? r.day : min), rows[0].day);
  const today = toUtcDateString(new Date());

  const points: DailyPoint[] = [];
  for (
    let cursor = new Date(`${earliestDate}T00:00:00.000Z`);
    cursor <= new Date(`${today}T00:00:00.000Z`);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const day = toUtcDateString(cursor);
    points.push({ date: day, value: sums.get(day) ?? 0 });
  }

  const total = points.reduce((sum, p) => sum + p.value, 0);

  let changePercent: number | null = null;
  if (points.length >= MIN_DAYS_FOR_TREND) {
    const mid = Math.floor(points.length / 2);
    const earlierSum = points.slice(0, mid).reduce((s, p) => s + p.value, 0);
    const laterSum = points.slice(mid).reduce((s, p) => s + p.value, 0);
    if (earlierSum > 0) {
      changePercent = Math.round(((laterSum - earlierSum) / earlierSum) * 100);
    }
  }

  return { points, total, changePercent, earliestDate };
}

export async function getCreatorDailyAnalytics(
  walletAddress: string,
  days: number = ANALYTICS_WINDOW_DAYS,
): Promise<CreatorAnalytics> {
  const wallet = walletAddress.toLowerCase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: { uploaderWallet: wallet, ...publicAssetWhere },
    select: { id: true },
  });
  const assetIds = assets.map((a) => a.id);

  const [viewRows, downloadRows, purchaseRows] = await Promise.all([
    assetIds.length > 0
      ? prisma.assetViewEvent.findMany({
          where: { assetId: { in: assetIds }, createdAt: { gte: cutoff } },
          select: { createdAt: true },
        })
      : [],
    assetIds.length > 0
      ? prisma.downloadEvent.findMany({
          where: { assetId: { in: assetIds }, createdAt: { gte: cutoff } },
          select: { createdAt: true },
        })
      : [],
    prisma.marketplacePurchase.findMany({
      where: { sellerWallet: wallet, status: "CONFIRMED", confirmedAt: { gte: cutoff } },
      select: { confirmedAt: true, sellerAmountMix: true },
    }),
  ]);

  return {
    views: bucketDaily(viewRows.map((r) => ({ day: toUtcDateString(r.createdAt), value: 1 }))),
    downloads: bucketDaily(downloadRows.map((r) => ({ day: toUtcDateString(r.createdAt), value: 1 }))),
    earnings: bucketDaily(
      purchaseRows.map((r) => ({ day: toUtcDateString(r.confirmedAt!), value: r.sellerAmountMix })),
    ),
  };
}
