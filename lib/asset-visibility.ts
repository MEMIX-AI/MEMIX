import type { Prisma } from "@prisma/client";

// Shared visibility rule for every public-facing asset query (library,
// search, trending, fresh, asset detail, download). Keeps "banned
// uploaders' assets are hidden" (CLAUDE.md PERAN & AKSES) enforced in one
// place instead of being re-derived — and possibly forgotten — per query.
export const publicAssetWhere: Prisma.AssetWhereInput = {
  status: "ACTIVE",
  OR: [{ uploaderWallet: null }, { uploader: { status: { not: "BANNED" } } }],
};
