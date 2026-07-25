// Deterministic pastel color per tag name — same tag always renders the
// same color, without needing a color column in the Tag table. Named
// examples from the design brief get their exact requested color; any
// other tag falls back to a stable hash into the same palette.
const TAG_PALETTE = [
  { bg: "#d7f5ec", text: "#0f7a5c", border: "#b7e9d9" }, // mint
  { bg: "#d3f3f5", text: "#0e7c86", border: "#aee6ea" }, // cyan
  { bg: "#cdeeee", text: "#0d6e73", border: "#a3dedd" }, // turquoise
  { bg: "#dbe9fb", text: "#2456a8", border: "#bcd7f7" }, // soft blue
  { bg: "#cdeae6", text: "#106b64", border: "#a4dbd3" }, // teal
  { bg: "#e4f7e0", text: "#3c8a4a", border: "#c3ecba" }, // pale green
  { bg: "#e6f4fb", text: "#1f6f95", border: "#c4e6f6" }, // sky
] as const;

const NAMED_INDEX: Record<string, number> = {
  funny: 0,
  gaming: 1,
  cat: 2,
  reaction: 3,
  video: 4,
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
