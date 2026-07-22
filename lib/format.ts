import type { AssetType } from "@prisma/client";

// Meme-culture-flavored labels rather than the raw enum names.
export function assetTypeLabel(type: AssetType): string {
  switch (type) {
    case "IMAGE":
      return "template";
    case "VIDEO":
      return "clip";
    case "SOUND":
      return "sound";
  }
}

export function assetActionLabel(type: AssetType): string {
  return type === "IMAGE" ? "view" : "play";
}

// No license system exists yet (that's the later creator-marketplace
// phase per CLAUDE.md) — derived purely from isOriginal as a stand-in:
// user-submitted content is always free to download; original works are
// flagged as the ones that *may* carry commercial terms once that phase
// ships.
export function licenseBadge(isOriginal: boolean): {
  label: string;
  variant: "ok" | "dim";
} {
  return isOriginal
    ? { label: "commercial", variant: "dim" }
    : { label: "free · cc", variant: "ok" };
}

export function shortenWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} mb`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
