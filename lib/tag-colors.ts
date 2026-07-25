// Deterministic pastel color per tag name — same tag always renders the
// same color, without needing a color column in the Tag table. Named
// examples from the design brief get their exact requested color; any
// other tag falls back to a stable hash into the same palette.
const TAG_PALETTE = [
  { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" }, // green
  { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" }, // orange
  { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" }, // blue
  { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" }, // purple
  { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" }, // pink
  { bg: "#fef9c3", text: "#a16207", border: "#fef08a" }, // yellow
  { bg: "#cffafe", text: "#0e7490", border: "#a5f3fc" }, // cyan
] as const;

const NAMED_INDEX: Record<string, number> = {
  funny: 0,
  gaming: 1,
  cat: 2,
  reaction: 3,
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
