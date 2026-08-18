import { storage } from "./storage";

// The one place in the app that turns a stored storage KEY into an
// actually-fetchable URL — see the note at the top of lib/storage.ts for
// why these are kept separate. Call this only after the surrounding code
// has already confirmed the asset is currently visible (ACTIVE, uploader
// not banned); every current caller already does, since they all fetch
// through lib/assets.ts / lib/search.ts (which filter via
// lib/asset-visibility.ts#publicAssetWhere) before reaching this.

// The video placeholder is a static public asset (/video-placeholder.svg),
// not a storage key — never route it through storage.getUrl() or
// storage.delete(). Real storage keys never start with "/" (see
// path.posix.join in LocalStorageAdapter#save), so this is a safe, cheap
// way to tell them apart without threading extra state through every
// caller. Exported since both the self-delete route and the admin
// permanent-delete action need the same "is this actually a stored file"
// check before calling storage.delete().
export function isStorageKey(value: string): boolean {
  return !value.startsWith("/") && !/^https?:\/\//.test(value);
}

interface WithFileKeys {
  fileUrl: string;
  thumbnailUrl: string | null;
}

// Both resolvers below swallow a failed storage call rather than letting it
// throw: a Server Component page has no error boundary around a single
// broken image, so an unresolved thumbnailUrl must degrade to "this one
// asset has no thumbnail" (falls back to null — every current renderer,
// e.g. AssetCard, already has real fallback UI for that, an ImageOff icon
// in place of the image), never to "the whole page 500s." A transient/
// misconfigured storage backend is a production reality (rate limits,
// credential rotation, network blips); losing one thumbnail is recoverable,
// losing an entire profile/library page isn't. Real failures still aren't
// silent — the caught error content isn't logged here to avoid spamming
// render-time logs on a known-flaky backend, but each SavedFile-returning
// call site in lib/storage.ts already throws a descriptive Error, so anyone
// attaching a logger to `storage` itself still sees the real cause.
//
// fileUrl can't get the same null fallback — it's required, not optional,
// since it's the asset's own file. On failure it falls back to the raw
// storage key (same shape as the existing "not a storage key" branch),
// which is a real (if unplayable) string rather than null; this is a
// narrower, already-pre-existing risk specifically for next/image-rendered
// IMAGE-type fileUrls (components/AssetPreview.tsx's detail-page render,
// not the thumbnail grids this fix targets) — tracked separately, not
// fixed here.
export async function resolveAssetUrls<T extends WithFileKeys>(asset: T): Promise<T> {
  const [fileUrl, thumbnailUrl] = await Promise.all([
    isStorageKey(asset.fileUrl) ? storage.getUrl(asset.fileUrl).catch(() => asset.fileUrl) : Promise.resolve(asset.fileUrl),
    asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)
      ? storage.getUrl(asset.thumbnailUrl).catch(() => null)
      : Promise.resolve(asset.thumbnailUrl),
  ]);
  return { ...asset, fileUrl, thumbnailUrl } as T;
}

// Batches every fileUrl/thumbnailUrl key across the whole list into one
// storage.getUrls() round trip, instead of resolveAssetUrls()'s per-asset
// calls — the difference between 1 request and up to 2*N requests for a
// page like /library or the home page's featured/trending/fresh rails.
export async function resolveAssetUrlsMany<T extends WithFileKeys>(assets: T[]): Promise<T[]> {
  const keys = new Set<string>();
  for (const asset of assets) {
    if (isStorageKey(asset.fileUrl)) keys.add(asset.fileUrl);
    if (asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)) keys.add(asset.thumbnailUrl);
  }
  // One failed/misconfigured batch call degrades every asset in this list
  // to unresolved (raw key) URLs — still not a crash, same reasoning as
  // resolveAssetUrls above, just applied to the whole batch at once since
  // storage.getUrls() is one all-or-nothing request.
  const resolved =
    keys.size > 0
      ? await storage.getUrls(Array.from(keys)).catch(() => new Map<string, string>())
      : new Map<string, string>();

  return assets.map((asset) => ({
    ...asset,
    // Raw-key fallback for fileUrl, null fallback for thumbnailUrl — same
    // split reasoning as resolveAssetUrls above.
    fileUrl: isStorageKey(asset.fileUrl) ? resolved.get(asset.fileUrl) ?? asset.fileUrl : asset.fileUrl,
    thumbnailUrl:
      asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)
        ? resolved.get(asset.thumbnailUrl) ?? null
        : asset.thumbnailUrl,
  }));
}
