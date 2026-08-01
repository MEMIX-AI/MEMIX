// Deterministic color per tag name — same tag always renders the same
// color, without needing a color column in the Tag table. Named examples
// from the design brief get their exact requested hue; any other tag
// falls back to a stable hash into the same palette.
//
// v6 dark theme: bright saturated text on a low-alpha tint of the same
// hue plus a subtly-more-visible border — the old light-theme palette
// used pale pastel backgrounds (e.g. #d7f5ec) with dark, readable-on-pale
// text, which reads as a glaring bright patch against a near-black page
// instead of a soft tag chip. Same "glow chip" formula as lib/verdict.ts.
const TAG_PALETTE = [
  { bg: "rgba(109,243,196,.12)", text: "#6df3c4", border: "rgba(109,243,196,.28)" }, // mint (cat)
  { bg: "rgba(140,232,107,.12)", text: "#8ce86b", border: "rgba(140,232,107,.28)" }, // soft green (funny)
  { bg: "rgba(255,167,92,.12)", text: "#ffa75c", border: "rgba(255,167,92,.28)" }, // soft orange (gaming)
  { bg: "rgba(155,107,255,.14)", text: "#b794ff", border: "rgba(155,107,255,.3)" }, // soft purple (reaction)
  { bg: "rgba(91,124,255,.14)", text: "#91a8ff", border: "rgba(91,124,255,.3)" }, // soft blue (wojak)
  { bg: "rgba(79,216,255,.12)", text: "#4fd8ff", border: "rgba(79,216,255,.28)" }, // soft cyan (qa)
  { bg: "rgba(91,180,255,.12)", text: "#7ecbff", border: "rgba(91,180,255,.26)" }, // sky (fallback)
] as const;

const NAMED_INDEX: Record<string, number> = {
  cat: 0,
  funny: 1,
  gaming: 2,
  reaction: 3,
  wojak: 4,
  qa: 5,
};

export function tagColor(name: string): (typeof TAG_PALETTE)[number] {
  const lower = name.toLowerCase();
  if (lower in NAMED_INDEX) return TAG_PALETTE[NAMED_INDEX[lower]];

  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}
