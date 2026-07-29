import type { AssetType } from "@prisma/client";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";
import { getClientIp, hashIp } from "./ip-hash";
import { checkRateLimit } from "./rate-limit";

const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Real rolling 7-day window, aggregated from DownloadEvent (one row per
// download — see app/api/assets/[id]/download/route.ts, the only writer).
// Asset.downloadCount is a separate lifetime counter, still shown on the
// asset detail page, and deliberately NOT what trending sorts by anymore.
export async function getTrendingAssets(limit = 8) {
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);

  const grouped = await prisma.downloadEvent.groupBy({
    by: ["assetId"],
    where: { createdAt: { gte: since } },
    _count: { assetId: true },
    orderBy: { _count: { assetId: "desc" } },
    // Over-fetch past `limit` since some of the top-downloaded ids might
    // not currently be publicly visible (taken down / uploader banned
    // since the download happened) and get filtered out below.
    take: limit * 3,
  });
  if (grouped.length === 0) return [];

  const assets = await prisma.asset.findMany({
    where: { id: { in: grouped.map((g) => g.assetId) }, ...publicAssetWhere },
    include: { tags: true },
  });

  // prisma.findMany({ where: { id: { in: [...] } } }) doesn't preserve the
  // `in` list's order, so re-sort by the actual 7-day download count.
  const countByAssetId = new Map(grouped.map((g) => [g.assetId, g._count.assetId]));
  assets.sort((a, b) => (countByAssetId.get(b.id) ?? 0) - (countByAssetId.get(a.id) ?? 0));

  return assets.slice(0, limit);
}

export async function getFeaturedAssets(limit = 8) {
  return prisma.asset.findMany({
    where: { ...publicAssetWhere, featured: true },
    include: { tags: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getFreshAssets(limit = 8) {
  return prisma.asset.findMany({
    where: publicAssetWhere,
    include: { tags: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAssetById(id: string) {
  return prisma.asset.findFirst({
    where: { id, ...publicAssetWhere },
    include: { tags: true },
  });
}

const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// Real view tracking, deduped per (asset, IP) per window — reuses the
// existing DB-backed rate limiter as a "has this IP already counted a
// view for this asset in this window" check rather than building a
// second dedupe mechanism: checkRateLimit(key, limit=1, window) is
// exactly "true the first time in the window, false after" already.
// No login/wallet needed, matches "view = just opened the page."
export async function trackView(assetId: string): Promise<void> {
  const ip = getClientIp(headers());
  const key = `view:${assetId}:${hashIp(ip)}`;
  const { ok } = await checkRateLimit(key, 1, VIEW_DEDUPE_WINDOW_MS);
  if (!ok) return;

  await prisma.asset
    .update({ where: { id: assetId }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);
}

// "Librarian Picks" — real verdict data (only assets an admin has
// actually judged), not a fabricated curation algorithm. Home page
// section is labeled "Beta" alongside this — see components/librarian —
// since the Librarian itself is still keyword-search, not reasoning.
export async function getLibrarianPicks(limit = 8) {
  return prisma.asset.findMany({
    where: { ...publicAssetWhere, verdictStatus: { not: null } },
    include: { tags: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

// Type-filtered "popular" rail (Popular Sounds / Popular Videos on the
// home page) — real lifetime downloadCount ordering, not the rolling
// 7-day trending window getTrendingAssets uses. Simpler on purpose: a
// small catalogue doesn't have enough per-type volume yet to need a
// rolling window per type.
export async function getPopularByType(type: AssetType, limit = 8) {
  return prisma.asset.findMany({
    where: { ...publicAssetWhere, type },
    include: { tags: true },
    orderBy: { downloadCount: "desc" },
    take: limit,
  });
}
