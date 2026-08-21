import type { AssetType, Prisma, VerdictStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

export interface SearchParams {
  q?: string;
  type?: AssetType;
  /** Only meaningful when `type` resolves to IMAGE — splits the single
   * IMAGE AssetType into "template" (static) vs "gif" (animated), derived
   * from the real uploaded file's extension (see the imageKind handling
   * in searchAssets() below), never a fabricated flag. */
  imageKind?: "template" | "gif";
  tag?: string;
  /** Verdict-status filter (v5 verdict-first category pills) — distinct
   * from `type`, which filters on AssetType (image/video/sound).
   * `"UNVERDICTED"` is a sentinel (not a real enum value) meaning
   * `verdictStatus IS NULL` — the honest "no verdict yet" state. */
  verdictStatus?: VerdictStatus | "UNVERDICTED";
  /** Exact `peaked` string match (e.g. "2025") — peaked is free text, not
   * a real date field, so this is a plain equality filter, not a range. */
  peaked?: string;
  /** Defaults to "newest" (createdAt desc, existing behavior) when
   * omitted. "downloads" sorts by the real lifetime Asset.downloadCount
   * column — same field/pattern already used by
   * lib/assets.ts#getPopularByType, not a new counter. */
  sort?: "newest" | "downloads";
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

// Resolves an inbound legacy `cat` pill key (still linked from Home's
// inline category row, e.g. `/library?cat=sounds` — Home itself is out
// of scope for the /library upgrade this supports) into the equivalent
// type/verdictStatus/peaked filter, so old links keep working without
// duplicating the CATEGORY_FILTERS mapping table. Returns {} for an
// absent/unknown key.
export function resolveLegacyCat(catKey: string | undefined): {
  type?: AssetType;
  verdictStatus?: VerdictStatus;
  peaked?: string;
} {
  const legacy = CATEGORY_FILTERS.find((c) => c.key === catKey);
  if (!legacy) return {};
  return { type: legacy.type, verdictStatus: legacy.verdictStatus, peaked: legacy.peaked };
}

// /library's own filter rows, independent and combinable (unlike
// CATEGORY_FILTERS above, which mixes type/verdict/peaked into one
// mutually-exclusive pill list — kept only for the legacy `cat` alias).

// "gif" filters on the real uploaded file's extension (see
// lib/storage.ts#extensionFor — both storage adapters preserve it in the
// stored fileUrl key), never a fabricated flag: there is no distinct GIF
// AssetType in the schema, so this is the only honest way to split
// "template" (static image) from "gif" (animated) within AssetType.IMAGE.
export const TYPE_FILTERS: {
  key: string;
  label: string;
  type: AssetType;
  imageKind?: "template" | "gif";
}[] = [
  { key: "template", label: "Template", type: "IMAGE", imageKind: "template" },
  { key: "gif", label: "GIF", type: "IMAGE", imageKind: "gif" },
  { key: "video", label: "Video", type: "VIDEO" },
  { key: "sound", label: "Sound", type: "SOUND" },
];

// All 7 real states (6 enum values + the null "unverdicted" state) — a
// meme with no verdict yet is a real, honestly-labeled state, never
// hidden or treated as missing.
export const VERDICT_FILTERS: {
  key: string;
  label: string;
  verdictStatus: VerdictStatus | "UNVERDICTED";
}[] = [
  { key: "emerging", label: "Emerging", verdictStatus: "EMERGING" },
  { key: "live", label: "Live", verdictStatus: "LIVE" },
  { key: "peaking", label: "Peaking", verdictStatus: "PEAKING" },
  { key: "fading", label: "Fading", verdictStatus: "FADING" },
  { key: "dated", label: "Dated", verdictStatus: "DATED" },
  { key: "dead", label: "Dead", verdictStatus: "DEAD" },
  { key: "unverdicted", label: "Unverdicted", verdictStatus: "UNVERDICTED" },
];

export const SORT_OPTIONS: { key: "newest" | "downloads"; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "downloads", label: "Most Downloaded" },
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
  imageKind,
  tag,
  verdictStatus,
  peaked,
  sort,
  page = 1,
  pageSize = 24,
}: SearchParams) {
  const conditions: Prisma.AssetWhereInput[] = [publicAssetWhere];

  if (type) conditions.push({ type });
  if (imageKind === "gif") {
    conditions.push({ fileUrl: { endsWith: ".gif", mode: "insensitive" } });
  } else if (imageKind === "template") {
    conditions.push({ NOT: { fileUrl: { endsWith: ".gif", mode: "insensitive" } } });
  }
  if (tag) conditions.push({ tags: { some: { name: tag } } });
  if (verdictStatus === "UNVERDICTED") {
    conditions.push({ verdictStatus: null });
  } else if (verdictStatus) {
    conditions.push({ verdictStatus });
  }
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
  const orderBy: Prisma.AssetOrderByWithRelationInput =
    sort === "downloads" ? { downloadCount: "desc" } : { createdAt: "desc" };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { tags: true },
      orderBy,
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
