import type { AssetType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { publicAssetWhere } from "./asset-visibility";

export interface SearchParams {
  q?: string;
  type?: AssetType;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export const ASSET_TYPES: AssetType[] = ["IMAGE", "VIDEO", "SOUND"];

export function isAssetType(value: string | undefined): value is AssetType {
  return !!value && (ASSET_TYPES as string[]).includes(value);
}

/**
 * Plain LIKE-based contains search across title/description/tag names.
 *
 * TODO: upgrade to SQLite FTS5 (virtual table + MATCH) for real
 * full-text ranking once the catalog is big enough to need it — this
 * simple version was explicitly OK'd as the starting point.
 *
 * Note: SQLite's LIKE is case-insensitive for ASCII by default, unlike
 * Postgres — add `mode: "insensitive"` to the `contains` filters below
 * when migrating (see CLAUDE.md STACK on SQLite->Postgres portability).
 */
export async function searchAssets({
  q,
  type,
  tag,
  page = 1,
  pageSize = 24,
}: SearchParams) {
  const conditions: Prisma.AssetWhereInput[] = [publicAssetWhere];

  if (type) conditions.push({ type });
  if (tag) conditions.push({ tags: { some: { name: tag } } });
  if (q) {
    conditions.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { some: { name: { contains: q } } } },
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
