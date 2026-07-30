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

// "Joined Jul 2026" — real User.createdAt, month-granularity on purpose
// (a day-level join date isn't meaningfully different information for a
// profile page, and month grouping reads less like a precise timestamp).
export function formatJoinDate(date: Date): string {
  return `Joined ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
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

// Real elapsed time since a real timestamp (Asset.createdAt) — not a
// fabricated activity signal, just a friendlier rendering of a field
// that already exists.
export function formatRelativeTime(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)}d ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
