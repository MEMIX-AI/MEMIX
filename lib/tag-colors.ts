// Deterministic pastel color per tag name — same tag always renders the
// same color, without needing a color column in the Tag table. Named
// examples from the design brief get their exact requested color; any
// other tag falls back to a stable hash into the same palette.
const TAG_PALETTE = [
  { bg: "#d7f5ec", text: "#0f7a5c", border: "#b7e9d9" }, // mint (cat)
  { bg: "#e4f7e0", text: "#3c8a4a", border: "#c3ecba" }, // soft green (funny)
  { bg: "#fdecd6", text: "#b3651a", border: "#f6d9ae" }, // soft orange (gaming)
  { bg: "#ece3fb", text: "#6b46c1", border: "#d9c7f7" }, // soft purple (reaction)
  { bg: "#dbe9fb", text: "#2456a8", border: "#bcd7f7" }, // soft blue (wojak)
  { bg: "#d3f3f5", text: "#0e7c86", border: "#aee6ea" }, // soft cyan (qa)
  { bg: "#e6f4fb", text: "#1f6f95", border: "#c4e6f6" }, // sky (fallback)
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
