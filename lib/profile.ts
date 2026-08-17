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
