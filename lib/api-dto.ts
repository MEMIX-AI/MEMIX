import type { Asset, Tag } from "@prisma/client";

// The public, machine-facing shape for an asset — same fields regardless
// of which /api/v1/* endpoint returns it. Absolute URLs (unlike the
// human-facing pages, which use relative /api/storage/... paths) since an
// external caller has no notion of "this site's own relative path".
export function serializeAsset(
  asset: Asset & { tags: Tag[] },
  origin: string,
) {
  return {
    id: asset.id,
    title: asset.title,
    description: asset.description,
    type: asset.type,
    fileUrl: new URL(asset.fileUrl, origin).toString(),
    thumbnailUrl: asset.thumbnailUrl ? new URL(asset.thumbnailUrl, origin).toString() : null,
    fileSize: asset.fileSize,
    duration: asset.duration,
    isOriginal: asset.isOriginal,
    featured: asset.featured,
    downloadCount: asset.downloadCount,
    tags: asset.tags.map((t) => t.name),
    uploaderWallet: asset.uploaderWallet,
    createdAt: asset.createdAt,
  };
}
