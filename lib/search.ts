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
  page = 1,
  pageSize = 24,
}: SearchParams) {
  const conditions: Prisma.AssetWhereInput[] = [publicAssetWhere];

  if (type) conditions.push({ type });
  if (tag) conditions.push({ tags: { some: { name: tag } } });
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
