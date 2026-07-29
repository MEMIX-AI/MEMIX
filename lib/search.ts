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
