import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

export async function getTrendingAssets(limit = 8) {
  // "sementara: sort by downloadCount 7 hari terakhir" per spec, but we
  // only track a single cumulative downloadCount on Asset — there's no
  // timestamped download log to compute a real rolling 7-day window.
  // TODO: add a DownloadEvent(assetId, createdAt) log and aggregate over
  // the last 7 days once that's worth the extra write on every download.
  // For now this is the deliberately simple all-time approximation.
  return prisma.asset.findMany({
    where: publicAssetWhere,
    include: { tags: true },
    orderBy: { downloadCount: "desc" },
    take: limit,
  });
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
