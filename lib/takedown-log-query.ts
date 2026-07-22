import type { Prisma, TakedownAction } from "@prisma/client";

export const TAKEDOWN_ACTIONS: TakedownAction[] = [
  "TAKEDOWN",
  "RESTORE",
  "DELETE",
  "BAN_UPLOADER",
  "UNBAN_UPLOADER",
];

export interface TakedownLogFilters {
  action?: string;
  actionBy?: string;
  assetQuery?: string;
}

// Single source of truth for the log viewer page and the CSV export route
// — they must always agree on what a given filter set matches.
export function buildTakedownLogWhere(
  filters: TakedownLogFilters,
): Prisma.TakedownLogWhereInput {
  const where: Prisma.TakedownLogWhereInput = {};

  if (filters.action && (TAKEDOWN_ACTIONS as string[]).includes(filters.action)) {
    where.action = filters.action as TakedownAction;
  }

  if (filters.actionBy?.trim()) {
    where.actionBy = { contains: filters.actionBy.trim().toLowerCase() };
  }

  if (filters.assetQuery?.trim()) {
    const q = filters.assetQuery.trim();
    where.OR = [{ assetId: q }, { asset: { title: { contains: q } } }];
  }

  return where;
}
