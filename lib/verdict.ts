import type { VerdictStatus } from "@prisma/client";

// Single source of truth for how a verdict status renders — badge color,
// label — shared by AssetCard, the asset detail page, and anywhere else
// that needs to show a verdict. "Unverdicted" is a real, distinct state
// (see lib/api-dto.ts's API-facing version of this same idea), not an
// empty/missing value — an asset with no verdict yet still always shows
// a badge, it just honestly says so.
export const VERDICT_COLORS: Record<VerdictStatus, string> = {
  EMERGING: "var(--verdict-emerging)",
  LIVE: "var(--verdict-live)",
  PEAKING: "var(--verdict-peaking)",
  FADING: "var(--verdict-fading)",
  DATED: "var(--verdict-dated)",
  DEAD: "var(--verdict-dead)",
};

export function verdictLabel(status: VerdictStatus | null): string {
  return status ? status.toLowerCase() : "unverdicted";
}

export function verdictColor(status: VerdictStatus | null): string {
  return status ? VERDICT_COLORS[status] : "var(--coming-soon)";
}
