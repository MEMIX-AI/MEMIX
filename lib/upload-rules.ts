import type { AssetType } from "@prisma/client";

// Pure, dependency-free rules — safe to import from client components
// too (unlike lib/thumbnail.ts, which pulls in the Node-only `sharp`
// native module). Single source of truth for both the instant client-side
// hint and the real server-side enforcement in /api/upload.

export const ALLOWED_MIME_TYPES: Record<AssetType, string[]> = {
  IMAGE: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  VIDEO: ["video/mp4", "video/webm"],
  SOUND: ["audio/mpeg", "audio/wav", "audio/ogg"],
};

export const MAX_FILE_SIZE: Record<AssetType, number> = {
  // No max was specified for images in the spec — 10MB is a conservative
  // assumed default, not a hard product requirement.
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 50 * 1024 * 1024,
  SOUND: 20 * 1024 * 1024,
};

export function detectAssetType(mimeType: string): AssetType | null {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "SOUND";
  return null;
}

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
