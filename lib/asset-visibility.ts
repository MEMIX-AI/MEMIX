import type { Prisma } from "@prisma/client";

const NOT_BANNED: Prisma.AssetWhereInput = {
  OR: [{ uploaderWallet: null }, { uploader: { status: { not: "BANNED" } } }],
};

// For LISTING queries only — library search, trending, fresh, popular,
// librarian picks, home page. Unlisted/private assets must never appear
// here even though they're independently reachable by direct link (see
// assetAccessWhere below) — that's the whole point of "unlisted."
export const publicAssetWhere: Prisma.AssetWhereInput = {
  status: "ACTIVE",
  visibility: "PUBLIC",
  ...NOT_BANNED,
};

// For DIRECT-LINK access — asset detail page, download, like, view. Public
// and Unlisted are both reachable by anyone who has the link (no login
// needed, matching "browsing/downloading never needs a wallet"). Private
// is reachable only by the uploader themselves, checked against the
// current session's wallet — pass it in whenever the caller has one;
// omit it (the default) and private assets are correctly unreachable,
// which is the safe behavior for machine/API callers with no wallet
// context at all.
export function assetAccessWhere(viewerWallet?: string): Prisma.AssetWhereInput {
  return {
    status: "ACTIVE",
    AND: [
      NOT_BANNED,
      {
        OR: [
          { visibility: { in: ["PUBLIC", "UNLISTED"] } },
          ...(viewerWallet ? [{ visibility: "PRIVATE" as const, uploaderWallet: viewerWallet }] : []),
        ],
      },
    ],
  };
}
