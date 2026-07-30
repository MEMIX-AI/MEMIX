import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { isStorageKey } from "@/lib/asset-urls";
import { validateUpload } from "@/lib/upload-rules";
import { generateThumbnail } from "@/lib/thumbnail";
import { updateProfile, validateProfileUpdate } from "@/lib/profile";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB, per spec
const AVATAR_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// Self-service only — there is no "edit someone else's profile" path
// anywhere in this app. The wallet being updated is always the current
// session's own, never taken from the request body/URL (so there's
// nothing a client could even tamper with to target another profile).
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json({ error: "this account is banned" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const usernameRaw = formData.get("username");
  const xHandleRaw = formData.get("xHandle");
  const bioRaw = formData.get("bio");
  const avatarUrlRaw = formData.get("avatarUrl");

  const update = {
    username: usernameRaw != null ? String(usernameRaw).trim() : undefined,
    xHandle: xHandleRaw != null ? String(xHandleRaw) : undefined,
    bio: bioRaw != null ? String(bioRaw).trim() : undefined,
    avatarUrl: avatarUrlRaw != null ? String(avatarUrlRaw).trim() : undefined,
  };

  const validation = validateProfileUpdate(update);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // An uploaded file always wins over a pasted URL when both are present
  // — same "custom thumbnail wins" precedence as app/api/upload/route.ts.
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!AVATAR_MIME_TYPES.includes(avatarFile.type)) {
      return NextResponse.json(
        { error: `unsupported avatar type: ${avatarFile.type || "unknown"} (use png/jpeg/webp/gif)` },
        { status: 400 },
      );
    }
    if (avatarFile.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: `avatar is ${(avatarFile.size / 1024 / 1024).toFixed(1)}MB, over the 2MB limit` },
        { status: 400 },
      );
    }
    // Reuses the same IMAGE validation the asset-upload path uses, just
    // with this route's own (smaller) size cap already checked above.
    const looseValidation = validateUpload("IMAGE", avatarFile.type, avatarFile.size);
    if (!looseValidation.ok) {
      return NextResponse.json({ error: looseValidation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const thumbBuffer = await generateThumbnail("IMAGE", buffer).catch(() => null);
    if (!thumbBuffer) {
      return NextResponse.json(
        { error: "that image looks corrupted — try a different file or re-export it" },
        { status: 400 },
      );
    }
    const saved = await storage.save({
      buffer: thumbBuffer,
      originalName: "avatar.webp",
      mimeType: "image/webp",
      folder: "avatars",
    });
    update.avatarUrl = saved.key;
  }

  const updated = await updateProfile(user.walletAddress, update);

  // Resolved so a caller that just uploaded an avatar (see
  // components/EditProfileModal.tsx's dedicated avatar-only PATCH) can
  // show the real, persisted image immediately — same resolve-at-read
  // rule as every asset thumbnail (see lib/asset-urls.ts).
  const avatarUrl = updated.avatarUrl && isStorageKey(updated.avatarUrl)
    ? await storage.getUrl(updated.avatarUrl).catch(() => null)
    : updated.avatarUrl;

  return NextResponse.json({ ok: true, walletAddress: updated.walletAddress, avatarUrl });
}
