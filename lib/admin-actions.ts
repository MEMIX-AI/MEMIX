import { prisma } from "./prisma";
import { storage } from "./storage";
import { isStorageKey } from "./asset-urls";

/**
 * Every mutation here is admin-only and writes to the append-only
 * TakedownLog paper trail (CLAUDE.md POSISI LEGAL #4/#5). Callers (the
 * /api/admin/* routes) are responsible for the admin auth check —
 * these functions assume the caller is already verified.
 */

// Soft takedown — status flips, but the file stays in storage for the
// 30-day dispute window (see CLAUDE.md-adjacent instructions). Actual
// file removal only ever happens via deleteAssetPermanently.
export async function takedownAsset(
  assetId: string,
  adminWallet: string,
  reason: string,
  relatedReportId?: string,
) {
  await prisma.asset.update({
    where: { id: assetId },
    data: { status: "TAKEN_DOWN" },
  });

  await prisma.takedownLog.create({
    data: {
      assetId,
      actionBy: adminWallet,
      action: "TAKEDOWN",
      reason,
      relatedReportId,
    },
  });
}

export async function restoreAsset(
  assetId: string,
  adminWallet: string,
  reason: string,
) {
  await prisma.asset.update({
    where: { id: assetId },
    data: { status: "ACTIVE" },
  });

  await prisma.takedownLog.create({
    data: {
      assetId,
      actionBy: adminWallet,
      action: "RESTORE",
      reason,
    },
  });
}

// Hard delete — the irreversible one. Removes the real file + thumbnail
// from storage (unlike takedownAsset). Status stays TAKEN_DOWN since
// there's no separate "purged" status; the file being gone is what makes
// this permanent, not the status value.
export async function deleteAssetPermanently(
  assetId: string,
  adminWallet: string,
  reason: string,
) {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });

  if (isStorageKey(asset.fileUrl)) await storage.delete(asset.fileUrl);

  if (asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)) {
    await storage.delete(asset.thumbnailUrl);
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: { status: "TAKEN_DOWN" },
  });

  await prisma.takedownLog.create({
    data: {
      assetId,
      actionBy: adminWallet,
      action: "DELETE",
      reason,
    },
  });
}

// Ban cascades: every currently-ACTIVE asset from this uploader goes
// TAKEN_DOWN too, each getting its own TakedownLog row (so the log
// viewer's "filter per asset" stays meaningful for every affected asset,
// not just one arbitrary row for the whole ban).
export async function banUser(
  wallet: string,
  adminWallet: string,
  reason: string,
) {
  await prisma.user.update({
    where: { walletAddress: wallet },
    data: { status: "BANNED" },
  });

  const activeAssets = await prisma.asset.findMany({
    where: { uploaderWallet: wallet, status: "ACTIVE" },
    select: { id: true },
  });

  for (const asset of activeAssets) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "TAKEN_DOWN" },
    });
    await prisma.takedownLog.create({
      data: {
        assetId: asset.id,
        targetWallet: wallet,
        actionBy: adminWallet,
        action: "BAN_UPLOADER",
        reason,
      },
    });
  }

  if (activeAssets.length === 0) {
    // Still log the ban itself even with no assets to cascade.
    await prisma.takedownLog.create({
      data: {
        targetWallet: wallet,
        actionBy: adminWallet,
        action: "BAN_UPLOADER",
        reason,
      },
    });
  }
}

// Deliberately does NOT auto-restore the user's assets — some may be
// taken down for reasons unrelated to the ban (e.g. a separate report),
// so admins review and restore each one individually via Asset Management.
export async function unbanUser(
  wallet: string,
  adminWallet: string,
  reason: string,
) {
  await prisma.user.update({
    where: { walletAddress: wallet },
    data: { status: "ACTIVE" },
  });

  await prisma.takedownLog.create({
    data: {
      targetWallet: wallet,
      actionBy: adminWallet,
      action: "UNBAN_UPLOADER",
      reason,
    },
  });
}
