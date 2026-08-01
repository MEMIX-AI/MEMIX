import type { VerdictStatus } from "@prisma/client";

// Single source of truth for how a verdict status renders — badge
// colors, label — shared by AssetCard, the asset detail page, and
// anywhere else that needs to show a verdict. "Unverdicted" is a real,
// distinct state (see lib/api-dto.ts's API-facing version of this same
// idea), not an empty/missing value — an asset with no verdict yet
// still always shows a badge, it just honestly says so.
//
// v6 dark theme: bright saturated text/dot on a low-alpha tint of the
// same hue, with a slightly-more-visible border ring of that hue — the
// "glow chip" look from the reference mockup's .v-live/.v-dated/.v-dead
// (LIVE mint / DATED amber / DEAD dim gray, explicit brief colors).
// EMERGING/PEAKING share cyan's hue family (two shades) and FADING/DATED
// share amber's (two shades), same coherent pairing the old light-theme
// values used — only the exact hexes changed for dark-bg contrast; the
// old approach (a dark, "readable on a pale background" text color)
// would be nearly invisible text-on-dark on a near-black page now.
export const VERDICT_STYLES: Record<VerdictStatus, { dot: string; bg: string; text: string; border: string }> = {
  EMERGING: { dot: "#4fd8ff", bg: "rgba(79,216,255,.10)", text: "#4fd8ff", border: "rgba(79,216,255,.25)" },
  LIVE: { dot: "#6df3c4", bg: "rgba(109,243,196,.10)", text: "#6df3c4", border: "rgba(109,243,196,.28)" },
  PEAKING: { dot: "#7ee8ff", bg: "rgba(126,232,255,.10)", text: "#7ee8ff", border: "rgba(126,232,255,.25)" },
  FADING: { dot: "#ffcb80", bg: "rgba(255,203,128,.10)", text: "#ffcb80", border: "rgba(255,203,128,.22)" },
  DATED: { dot: "#ffb84d", bg: "rgba(255,184,77,.10)", text: "#ffb84d", border: "rgba(255,184,77,.24)" },
  DEAD: { dot: "#7b848e", bg: "rgba(123,132,142,.12)", text: "#9aa2aa", border: "rgba(123,132,142,.24)" },
};

const UNVERDICTED_STYLE = { dot: "#7b848e", bg: "rgba(123,132,142,.10)", text: "#9aa2aa", border: "rgba(123,132,142,.2)" };

export function verdictLabel(status: VerdictStatus | null): string {
  return status ? status.toLowerCase() : "unverdicted";
}

export function verdictStyle(status: VerdictStatus | null) {
  return status ? VERDICT_STYLES[status] : UNVERDICTED_STYLE;
}
