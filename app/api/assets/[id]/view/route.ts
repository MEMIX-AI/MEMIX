import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere } from "@/lib/asset-visibility";
import { getClientIp, hashIp } from "@/lib/ip-hash";

// Rolling 24h window per (asset, IP) — "rolling" meaning it's measured from
// this IP's own last counted view, not a fixed calendar/UTC boundary. That's
// why this is a real upsert-and-compare against AssetViewer.viewedAt rather
// than the fixed-window RateLimitBucket used elsewhere in this codebase.
const VIEW_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const asset = await prisma.asset.findFirst({
    where: { id: params.id, ...publicAssetWhere },
    select: { id: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  const ipHash = hashIp(getClientIp(req.headers));
  const now = new Date();
  const cutoff = new Date(now.getTime() - VIEW_DEDUPE_WINDOW_MS);

  const existing = await prisma.assetViewer.findUnique({
    where: { assetId_ipHash: { assetId: asset.id, ipHash } },
  });
  if (existing && existing.viewedAt > cutoff) {
    return NextResponse.json({ counted: false });
  }

  const [, updatedAsset] = await prisma.$transaction([
    prisma.assetViewer.upsert({
      where: { assetId_ipHash: { assetId: asset.id, ipHash } },
      create: { assetId: asset.id, ipHash, viewedAt: now },
      update: { viewedAt: now },
    }),
    prisma.asset.update({
      where: { id: asset.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    }),
  ]);

  return NextResponse.json({ counted: true, viewCount: updatedAsset.viewCount });
}
