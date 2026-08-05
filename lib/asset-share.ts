import { cache } from "react";
import { getAssetById } from "./assets";

// The one place both generateMetadata and the page component (and
// opengraph-image.tsx, in its own separate request) ask "what's the
// publicly shareable version of this asset" — always PUBLIC/UNLISTED only,
// never viewer-scoped. Link previews have no session, and a share card
// must show the exact same thing to everyone regardless of who's signed
// in, so this deliberately never takes a viewer wallet (unlike the page's
// own render path, which does fall back to a viewer-scoped query for the
// PRIVATE-owned-by-viewer case — that fallback has no business existing
// here, since a PRIVATE asset must never appear in a shared link preview).
//
// Wrapped in React's cache() so generateMetadata and the page component —
// which both run within the same request for a normal page load — hit the
// database once, not twice.
export const getShareAsset = cache(async (id: string) => {
  return getAssetById(id);
});
