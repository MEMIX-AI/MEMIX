import sharp from "sharp";
import type { AssetType } from "@prisma/client";

const ALLOWED_MIME_TYPES: Record<AssetType, string[]> = {
  IMAGE: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  VIDEO: ["video/mp4", "video/webm"],
  SOUND: ["audio/mpeg", "audio/wav", "audio/ogg"],
};

const MAX_FILE_SIZE: Record<AssetType, number> = {
  // No max was specified for images in the spec — 10MB is a conservative
  // assumed default, not a hard product requirement.
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 50 * 1024 * 1024,
  SOUND: 20 * 1024 * 1024,
};

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateUpload(
  type: AssetType,
  mimeType: string,
  fileSize: number,
): UploadValidationResult {
  if (!ALLOWED_MIME_TYPES[type].includes(mimeType)) {
    return {
      ok: false,
      error: `${mimeType} is not an allowed file type for ${type.toLowerCase()} (allowed: ${ALLOWED_MIME_TYPES[type].join(", ")})`,
    };
  }

  const maxSize = MAX_FILE_SIZE[type];
  if (fileSize > maxSize) {
    return {
      ok: false,
      error: `file is ${(fileSize / 1024 / 1024).toFixed(1)}MB, over the ${maxSize / 1024 / 1024}MB limit for ${type.toLowerCase()}`,
    };
  }

  return { ok: true };
}

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
