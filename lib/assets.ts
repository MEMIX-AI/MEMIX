import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

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
