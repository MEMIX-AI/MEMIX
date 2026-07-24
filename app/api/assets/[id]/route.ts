import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isStorageKey } from "@/lib/asset-urls";

// Self-service delete only — an uploader removing their own asset. Admin
// takedowns of *other* people's assets are a separate future admin-panel
// action, not this route.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  // Deliberately not filtered through publicAssetWhere — an owner must be
  // able to manage (and delete) their own asset even if it's already
  // TAKEN_DOWN or otherwise hidden from the public library.
  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (asset.uploaderWallet !== user.walletAddress) {
    return NextResponse.json(
      { error: "you can only delete your own assets" },
      { status: 403 },
    );
  }

  // Soft delete: flip status (hides it from every public query) and drop
  // the underlying file. asset.fileUrl/thumbnailUrl are bare storage keys
  // (see lib/storage.ts) — the video placeholder is the one exception,
  // a shared /public asset rather than a per-asset storage object, so
  // it's never deleted here.
  await storage.delete(asset.fileUrl);
  if (asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)) {
    await storage.delete(asset.thumbnailUrl);
  }

  await prisma.asset.update({
    where: { id: asset.id },
    data: { status: "TAKEN_DOWN" },
  });

  await prisma.takedownLog.create({
    data: {
      assetId: asset.id,
      actionBy: user.walletAddress,
      action: "DELETE",
      reason: "deleted by uploader",
    },
  });

  return NextResponse.json({ ok: true });
}
