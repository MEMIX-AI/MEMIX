import type { Asset, Tag } from "@prisma/client";
import { resolveAssetUrls } from "./asset-urls";

// The public, machine-facing shape for an asset — same fields regardless
// of which /api/v1/* endpoint returns it. Absolute URLs (unlike the
// human-facing pages, which use relative /api/storage/... paths) since an
// external caller has no notion of "this site's own relative path".
//
// Async because asset.fileUrl/thumbnailUrl are storage KEYS, not
// resolved URLs (see the note at the top of lib/storage.ts) — resolving
// them here, right before serialization, is what makes a future
// private-bucket signed URL actually work through this endpoint too, not
// just through the human-facing pages.
export async function serializeAsset(
  asset: Asset & { tags: Tag[] },
  origin: string,
) {
  const resolved = await resolveAssetUrls(asset);
  return {
    id: resolved.id,
    title: resolved.title,
    description: resolved.description,
    type: resolved.type,
    fileUrl: new URL(resolved.fileUrl, origin).toString(),
    thumbnailUrl: resolved.thumbnailUrl ? new URL(resolved.thumbnailUrl, origin).toString() : null,
    fileSize: resolved.fileSize,
    duration: resolved.duration,
    isOriginal: resolved.isOriginal,
    featured: resolved.featured,
    downloadCount: resolved.downloadCount,
    tags: resolved.tags.map((t) => t.name),
    uploaderWallet: resolved.uploaderWallet,
    createdAt: resolved.createdAt,
    // MV—005 verdict fields. verdictStatus is admin-filled and nullable
    // (see components/admin/VerdictEditor.tsx) — reported as "unverdicted"
    // rather than a bare null/missing key, so a caller can tell "not yet
    // judged" apart from a bug. peaked/works_when/avoid_when stay null
    // when unset; there's no equivalent "not applicable" state for those.
    // snake_case here (unlike the rest of this DTO) to match the exact
    // shape already documented on /docs' "target shape" example.
    status: resolved.verdictStatus ? resolved.verdictStatus.toLowerCase() : "unverdicted",
    peaked: resolved.peaked,
    works_when: resolved.worksWhen,
    avoid_when: resolved.avoidWhen,
  };
}
