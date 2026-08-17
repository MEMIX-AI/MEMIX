import { storage } from "./storage";
import { validateUpload } from "./upload-rules";
import { generateThumbnail } from "./thumbnail";
import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

const MAX_USERNAME_LENGTH = 40;
const MAX_X_HANDLE_LENGTH = 30;
const MAX_DISCORD_HANDLE_LENGTH = 40;
const MAX_BIO_LENGTH = 280;
const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB, per spec
const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

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

export interface ProfileStats {
  uploadCount: number;
  totalDownloads: number;
  totalLikes: number;
}

// A single aggregate query, not a COUNT() plus a fetch-everything-and-sum
// — this scales with catalogue size the same way lib/assets.ts's other
// aggregate reads do (see app/admin/page.tsx's downloadCount aggregate
// for the same pattern).
export async function getProfileStats(walletAddress: string): Promise<ProfileStats> {
  const [uploadCount, agg] = await Promise.all([
    prisma.asset.count({
      where: { uploaderWallet: walletAddress.toLowerCase(), ...publicAssetWhere },
    }),
    prisma.asset.aggregate({
      where: { uploaderWallet: walletAddress.toLowerCase(), ...publicAssetWhere },
      _sum: { downloadCount: true, likeCount: true },
    }),
  ]);

  return {
    uploadCount,
    totalDownloads: agg._sum.downloadCount ?? 0,
    totalLikes: agg._sum.likeCount ?? 0,
  };
}

export interface ProfileUpdateInput {
  username?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
  xHandle?: string | null;
  discordHandle?: string | null;
  websiteUrl?: string | null;
  bio?: string | null;
  // Only ever set by app/api/creators/join/route.ts — PATCH /api/profile
  // never reads a "creatorOnboardedAt" form field, so a client can't set
  // this through the general profile-edit endpoint.
  creatorOnboardedAt?: Date;
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
  if (input.handle != null && input.handle !== "" && !HANDLE_RE.test(input.handle)) {
    return {
      ok: false,
      error: "username must be 3-24 characters, lowercase letters/numbers/underscore only",
    };
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

// Handles are stored lowercase so uniqueness is case-insensitive by
// construction (no citext/lower() index needed) — "Josh" and "josh" are
// the same handle. Empty string normalizes to null (clearing it), same
// convention as every other nullable profile field here.
export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

// Excludes the wallet's own current row so a creator re-saving their
// unchanged handle (or any other field) never trips over "taken by
// themselves". Case-insensitive by construction since handles are always
// stored lowercase (normalizeHandle above) — every caller must normalize
// before calling this, this function doesn't normalize its input itself.
export async function isHandleAvailable(handle: string, excludeWallet: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { handle } });
  return !existing || existing.walletAddress === excludeWallet.toLowerCase();
}

// Same check as app/api/profile/[wallet]/follow/route.ts's local copy —
// centralized here since both callers of the handle-uniqueness path
// (PATCH /api/profile and POST /api/creators/join) need it as a fallback
// behind isHandleAvailable's pre-check, which only closes most of the
// race: two submits for the same handle landing between that check and
// the actual write would otherwise surface as an unhandled 500 instead of
// a clean 409.
export function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

export interface AvatarSaveResult {
  ok: true;
  key: string;
}
export interface AvatarSaveError {
  ok: false;
  error: string;
}

// Shared by app/api/profile/route.ts (editing an existing profile) and
// app/api/creators/join/route.ts (initial creator onboarding) — same
// validate-thumbnail-store pipeline, one definition instead of two
// drifting copies. Returns a storage KEY, never a URL (see lib/storage.ts
// — resolve to a signed URL only at render time, never persist one).
export async function saveAvatarUpload(file: File): Promise<AvatarSaveResult | AvatarSaveError> {
  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: `unsupported avatar type: ${file.type || "unknown"} (use png/jpeg/webp/gif)` };
  }
  if (file.size > MAX_AVATAR_SIZE) {
    return { ok: false, error: `avatar is ${(file.size / 1024 / 1024).toFixed(1)}MB, over the 2MB limit` };
  }
  const looseValidation = validateUpload("IMAGE", file.type, file.size);
  if (!looseValidation.ok) {
    return { ok: false, error: looseValidation.error };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const thumbBuffer = await generateThumbnail("IMAGE", buffer).catch(() => null);
  if (!thumbBuffer) {
    return { ok: false, error: "that image looks corrupted — try a different file or re-export it" };
  }
  const saved = await storage.save({
    buffer: thumbBuffer,
    originalName: "avatar.webp",
    mimeType: "image/webp",
    folder: "avatars",
  });
  return { ok: true, key: saved.key };
}

export async function updateProfile(walletAddress: string, input: ProfileUpdateInput) {
  return prisma.user.update({
    where: { walletAddress: walletAddress.toLowerCase() },
    data: {
      ...(input.username !== undefined && { username: input.username?.trim() || null }),
      ...(input.handle !== undefined && { handle: normalizeHandle(input.handle) }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl || null }),
      ...(input.xHandle !== undefined && { xHandle: normalizeXHandle(input.xHandle) }),
      ...(input.discordHandle !== undefined && { discordHandle: input.discordHandle?.trim() || null }),
      ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl?.trim() || null }),
      ...(input.bio !== undefined && { bio: input.bio?.trim() || null }),
      ...(input.creatorOnboardedAt !== undefined && { creatorOnboardedAt: input.creatorOnboardedAt }),
    },
  });
}

// Single-wallet version of lib/creators.ts's aggregate — same real
// sources (works from Asset, sales/earnings from CONFIRMED
// MarketplacePurchase, followers from Follow), just scoped to the one
// profile being rendered instead of the whole directory.
export interface CreatorStats {
  works: number;
  followers: number;
  sales: number;
  earnedMix: number;
}

export async function getCreatorStats(walletAddress: string): Promise<CreatorStats> {
  const wallet = walletAddress.toLowerCase();
  const [works, followers, salesAgg] = await Promise.all([
    prisma.asset.count({ where: { uploaderWallet: wallet, ...publicAssetWhere } }),
    prisma.follow.count({ where: { followingWallet: wallet } }),
    prisma.marketplacePurchase.aggregate({
      where: { sellerWallet: wallet, status: "CONFIRMED" },
      _count: { _all: true },
      _sum: { sellerAmountMix: true },
    }),
  ]);
  return {
    works,
    followers,
    sales: salesAgg._count._all,
    earnedMix: salesAgg._sum.sellerAmountMix ?? 0,
  };
}
