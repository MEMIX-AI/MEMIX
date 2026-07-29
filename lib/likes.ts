import { prisma } from "./prisma";

// Batch "which of these assets has this wallet already liked" — one
// query per page render (home page renders 5 asset rails, library page
// renders one grid), not one query per card.
export async function getLikedAssetIds(
  walletAddress: string | undefined,
  assetIds: string[],
): Promise<Set<string>> {
  if (!walletAddress || assetIds.length === 0) return new Set();

  const rows = await prisma.assetLike.findMany({
    where: { walletAddress, assetId: { in: assetIds } },
    select: { assetId: true },
  });
  return new Set(rows.map((r) => r.assetId));
}
