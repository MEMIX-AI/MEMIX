import type { AssetType, Prisma, VerdictStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

export interface SearchParams {
  q?: string;
  type?: AssetType;
  tag?: string;
  /** Verdict-status filter (v5 verdict-first category pills) — distinct
   * from `type`, which filters on AssetType (image/video/sound). */
  verdictStatus?: VerdictStatus;
  /** Exact `peaked` string match (e.g. "2025") — peaked is free text, not
   * a real date field, so this is a plain equality filter, not a range. */
  peaked?: string;
  page?: number;
  pageSize?: number;
}

export const VERDICT_STATUSES: VerdictStatus[] = [
  "EMERGING",
  "LIVE",
  "PEAKING",
  "FADING",
  "DATED",
  "DEAD",
];

export function isVerdictStatus(value: string | undefined): value is VerdictStatus {
  return !!value && (VERDICT_STATUSES as string[]).includes(value);
}

export const ASSET_TYPES: AssetType[] = ["IMAGE", "VIDEO", "SOUND"];

export function isAssetType(value: string | undefined): value is AssetType {
  return !!value && (ASSET_TYPES as string[]).includes(value);
}

// Verdict-first category pills — a flat, mutually-exclusive list mixing
// three different underlying filters (verdict status, peaked year, asset
// type), unified behind one `cat` key so callers (the /library filter
// row, the home page hero) can render one row of pills instead of three
// separate filter groups. "gifs" maps to the real IMAGE type — there's
// no distinct GIF type in the schema (an uploaded GIF is stored as an
// image), so this is a relabel of a real filter, not a fabricated one.
export const CATEGORY_FILTERS: {
  key: string;
  label: string;
  type?: AssetType;
  verdictStatus?: VerdictStatus;
  peaked?: string;
}[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live", verdictStatus: "LIVE" },
  { key: "dated", label: "Dated", verdictStatus: "DATED" },
  { key: "peaked-2025", label: "Peaked 2025", peaked: "2025" },
  { key: "peaked-2024", label: "Peaked 2024", peaked: "2024" },
  { key: "sounds", label: "Sounds", type: "SOUND" },
  { key: "videos", label: "Videos", type: "VIDEO" },
  { key: "gifs", label: "GIFs", type: "IMAGE" },
];

/**
 * Plain LIKE-based contains search across title/description/tag names.
 *
 * TODO: upgrade to Postgres full-text search (tsvector/tsquery) for real
 * ranking once the catalog is big enough to need it — this simple
 * version was explicitly OK'd as the starting point.
 *
 * `mode: "insensitive"` is required here on Postgres (unlike SQLite,
 * whose LIKE was case-insensitive for ASCII by default) — see
 * docs/deploy-checklist.md's SQLite->Postgres portability note.
 */
export async function searchAssets({
  q,
  type,
  tag,
  verdictStatus,
  peaked,
  page = 1,
  pageSize = 24,
}: SearchParams) {
  const conditions: Prisma.AssetWhereInput[] = [publicAssetWhere];

  if (type) conditions.push({ type });
  if (tag) conditions.push({ tags: { some: { name: tag } } });
  if (verdictStatus) conditions.push({ verdictStatus });
  if (peaked) conditions.push({ peaked });
  if (q) {
    conditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  const where: Prisma.AssetWhereInput = { AND: conditions };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { tags: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    assets,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
