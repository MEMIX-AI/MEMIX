import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { isStorageKey } from "@/lib/asset-urls";
import {
  updateProfile,
  validateProfileUpdate,
  normalizeHandle,
  isHandleAvailable,
  isUniqueConstraintError,
  saveAvatarUpload,
} from "@/lib/profile";

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
  const handleRaw = formData.get("handle");
  const xHandleRaw = formData.get("xHandle");
  const discordHandleRaw = formData.get("discordHandle");
  const websiteUrlRaw = formData.get("websiteUrl");
  const bioRaw = formData.get("bio");
  const avatarUrlRaw = formData.get("avatarUrl");

  const update = {
    username: usernameRaw != null ? String(usernameRaw).trim() : undefined,
    // Normalized (lowercased) up front so validateProfileUpdate's format
    // check and the uniqueness check below both see the same value that
    // will actually be persisted.
    handle: handleRaw != null ? normalizeHandle(String(handleRaw)) ?? "" : undefined,
    xHandle: xHandleRaw != null ? String(xHandleRaw) : undefined,
    discordHandle: discordHandleRaw != null ? String(discordHandleRaw).trim() : undefined,
    websiteUrl: websiteUrlRaw != null ? String(websiteUrlRaw).trim() : undefined,
    bio: bioRaw != null ? String(bioRaw).trim() : undefined,
    avatarUrl: avatarUrlRaw != null ? String(avatarUrlRaw).trim() : undefined,
  };

  const validation = validateProfileUpdate(update);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (update.handle) {
    const available = await isHandleAvailable(update.handle, user.walletAddress);
    if (!available) {
      return NextResponse.json({ error: "that username is already taken" }, { status: 409 });
    }
  }

  // An uploaded file always wins over a pasted URL when both are present
  // — same "custom thumbnail wins" precedence as app/api/upload/route.ts.
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const saved = await saveAvatarUpload(avatarFile);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    update.avatarUrl = saved.key;
  }

  let updated;
  try {
    updated = await updateProfile(user.walletAddress, update);
  } catch (err) {
    // isHandleAvailable above closes most of the race window, not all of
    // it — see the same comment in app/api/creators/join/route.ts.
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: "that username is already taken" }, { status: 409 });
    }
    throw err;
  }

  // Resolved so a caller that just uploaded an avatar (see
  // components/EditProfileModal.tsx's dedicated avatar-only PATCH) can
  // show the real, persisted image immediately — same resolve-at-read
  // rule as every asset thumbnail (see lib/asset-urls.ts).
  const avatarUrl = updated.avatarUrl && isStorageKey(updated.avatarUrl)
    ? await storage.getUrl(updated.avatarUrl).catch(() => null)
    : updated.avatarUrl;

  return NextResponse.json({ ok: true, walletAddress: updated.walletAddress, avatarUrl });
}
