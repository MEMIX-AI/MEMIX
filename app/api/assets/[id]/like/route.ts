import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assetAccessWhere } from "@/lib/asset-visibility";
import { getClientIp, hashIp } from "@/lib/ip-hash";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth";

// New-like throttle only (not toggling off an existing like) — a basic
// backstop against one IP spamming fresh AssetLike rows with throwaway
// clientIds, not an attempt to make liking un-gameable.
const LIKE_CREATE_LIMIT = 20;
const LIKE_CREATE_WINDOW_MS = 60 * 60 * 1000;

// No wallet/login required — 1 browser = 1 like per asset, identified by a
// random `clientId` the browser generates once and keeps in localStorage
// (see components/LikeButton.tsx). Enforced by AssetLike's real
// unique(assetId, clientId) constraint, not just this route's own logic.
// likeCount is updated in the same transaction as the AssetLike row so the
// two can never drift apart, regardless of what else touches this table.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId || clientId.length > 100) {
    return NextResponse.json({ error: "missing client id" }, { status: 400 });
  }

  const viewer = await getCurrentUser();
  const asset = await prisma.asset.findFirst({
    where: { id: params.id, ...assetAccessWhere(viewer?.walletAddress) },
  });
  if (!asset) {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  const existing = await prisma.assetLike.findUnique({
    where: { assetId_clientId: { assetId: asset.id, clientId } },
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

  const ip = getClientIp(req.headers);
  const { ok } = await checkRateLimit(`like-create:${hashIp(ip)}`, LIKE_CREATE_LIMIT, LIKE_CREATE_WINDOW_MS);
  if (!ok) {
    return NextResponse.json({ error: "too many likes from this network, try again later" }, { status: 429 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.assetLike.create({
      data: { assetId: asset.id, clientId },
    }),
    prisma.asset.update({
      where: { id: asset.id },
      data: { likeCount: { increment: 1 } },
    }),
  ]);
  return NextResponse.json({ liked: true, likeCount: updated.likeCount });
}
