import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere } from "@/lib/asset-visibility";

// Toggle like/unlike for the signed-in wallet. 1 wallet = 1 like per
// asset — enforced by AssetLike's real unique(assetId, walletAddress)
// constraint, not just this route's own logic. likeCount is updated in
// the same transaction as the AssetLike row so the two can never drift
// apart, regardless of what else touches this table.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required to like" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json({ error: "this account is banned" }, { status: 403 });
  }

  const asset = await prisma.asset.findFirst({ where: { id: params.id, ...publicAssetWhere } });
  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  const existing = await prisma.assetLike.findUnique({
    where: { assetId_walletAddress: { assetId: asset.id, walletAddress: user.walletAddress } },
  });

  if (existing) {
    const [, updated] = await prisma.$transaction([
      prisma.assetLike.delete({ where: { id: existing.id } }),
      prisma.asset.update({
        where: { id: asset.id },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ liked: false, likeCount: updated.likeCount });
  }

  const [, updated] = await prisma.$transaction([
    prisma.assetLike.create({
      data: { assetId: asset.id, walletAddress: user.walletAddress },
    }),
    prisma.asset.update({
      where: { id: asset.id },
      data: { likeCount: { increment: 1 } },
    }),
  ]);
  return NextResponse.json({ liked: true, likeCount: updated.likeCount });
}
