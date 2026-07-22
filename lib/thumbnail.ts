import sharp from "sharp";
import type { AssetType } from "@prisma/client";

// Server-only (imports the native `sharp` module) — never import this
// from a client component. Pure validation rules live in lib/upload-rules.ts
// instead, which client code can safely share.

// Static placeholder shown for video assets until real thumbnail
// extraction ships — no ffmpeg in this phase (see CLAUDE.md STACK note).
export const VIDEO_PLACEHOLDER_THUMBNAIL_URL = "/video-placeholder.svg";

/**
 * Generates a thumbnail buffer for an uploaded file, where possible.
 * - IMAGE: real thumbnail via sharp (resized, webp).
 * - VIDEO: null — caller should use VIDEO_PLACEHOLDER_THUMBNAIL_URL instead.
 * - SOUND: null — sound assets have no thumbnail.
 */
export async function generateThumbnail(
  type: AssetType,
  buffer: Buffer,
): Promise<Buffer | null> {
  if (type === "IMAGE") {
    return sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  }
  return null;
}
