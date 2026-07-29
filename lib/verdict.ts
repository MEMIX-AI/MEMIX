import type { VerdictStatus } from "@prisma/client";

// Single source of truth for how a verdict status renders — badge
// colors, label — shared by AssetCard, the asset detail page, and
// anywhere else that needs to show a verdict. "Unverdicted" is a real,
// distinct state (see lib/api-dto.ts's API-facing version of this same
// idea), not an empty/missing value — an asset with no verdict yet
// still always shows a badge, it just honestly says so.
//
// bg/text pairs match the reference mockup's .v-live/.v-dated/.v-dead
// exactly; EMERGING/PEAKING/FADING (not in the mockup, which only shows
// three statuses) follow the same "tinted background, darker readable
// text of the same hue" formula to fit in visually.
export const VERDICT_STYLES: Record<VerdictStatus, { dot: string; bg: string; text: string }> = {
  EMERGING: { dot: "#18b8d8", bg: "rgba(24,184,216,.12)", text: "#0e7a94" },
  LIVE: { dot: "#3ccb7f", bg: "rgba(60,203,127,.12)", text: "#2c9d61" },
  PEAKING: { dot: "#63d8f2", bg: "rgba(99,216,242,.14)", text: "#1c7c9c" },
  FADING: { dot: "#f0b94d", bg: "rgba(240,185,77,.14)", text: "#a6791f" },
  DATED: { dot: "#f5a623", bg: "rgba(245,166,35,.14)", text: "#c47f0e" },
  DEAD: { dot: "#9aa7ad", bg: "rgba(154,167,173,.18)", text: "#6d7a80" },
};

const UNVERDICTED_STYLE = { dot: "#9aa7ad", bg: "rgba(154,167,173,.14)", text: "#6d7a80" };

export function verdictLabel(status: VerdictStatus | null): string {
  return status ? status.toLowerCase() : "unverdicted";
}

export function verdictStyle(status: VerdictStatus | null) {
  return status ? VERDICT_STYLES[status] : UNVERDICTED_STYLE;
}
