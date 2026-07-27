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

export async function resolveAssetUrls<T extends WithFileKeys>(asset: T): Promise<T> {
  const [fileUrl, thumbnailUrl] = await Promise.all([
    isStorageKey(asset.fileUrl) ? storage.getUrl(asset.fileUrl) : Promise.resolve(asset.fileUrl),
    asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)
      ? storage.getUrl(asset.thumbnailUrl)
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
  const resolved = keys.size > 0 ? await storage.getUrls(Array.from(keys)) : new Map<string, string>();

  return assets.map((asset) => ({
    ...asset,
    fileUrl: isStorageKey(asset.fileUrl) ? resolved.get(asset.fileUrl) ?? asset.fileUrl : asset.fileUrl,
    thumbnailUrl:
      asset.thumbnailUrl && isStorageKey(asset.thumbnailUrl)
        ? resolved.get(asset.thumbnailUrl) ?? asset.thumbnailUrl
        : asset.thumbnailUrl,
  }));
}
