import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateProfile,
  validateProfileUpdate,
  normalizeHandle,
  normalizeXHandle,
  isHandleAvailable,
  isUniqueConstraintError,
  saveAvatarUpload,
} from "@/lib/profile";

// The Become-a-Creator registration step (app/creators/page.tsx's CTAs,
// via components/BecomeCreatorModal.tsx) — distinct from the general
// PATCH /api/profile edit flow because Name + Username are REQUIRED here
// and this is what actually sets User.creatorOnboardedAt, the one real
// "is this wallet a registered creator" flag (see prisma/schema.prisma —
// nothing else in User/UserRole represents it). Uploading itself stays
// fully independent of this — see app/api/upload/route.ts, gated only on
// a signed-in, non-banned wallet, same as before this route existed.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json({ error: "this account is banned" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({
    where: { walletAddress: user.walletAddress },
    select: { creatorOnboardedAt: true },
  });
  if (existing?.creatorOnboardedAt) {
    return NextResponse.json({ error: "this wallet is already a creator" }, { status: 409 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const username = String(formData.get("username") ?? "").trim();
  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  const xHandleRaw = formData.get("xHandle");
  const agreesToTerms = formData.get("agreesToTerms") === "true";

  if (!username) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }
  if (!agreesToTerms) {
    return NextResponse.json({ error: "you must agree to the Terms of Service" }, { status: 400 });
  }

  const update = {
    username,
    handle,
    xHandle: xHandleRaw != null ? String(xHandleRaw) : undefined,
  };

  const validation = validateProfileUpdate(update);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const available = await isHandleAvailable(handle, user.walletAddress);
  if (!available) {
    return NextResponse.json({ error: "that username is already taken" }, { status: 409 });
  }

  let avatarUrl: string | undefined;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const saved = await saveAvatarUpload(avatarFile);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    avatarUrl = saved.key;
  }

  try {
    await updateProfile(user.walletAddress, {
      username,
      handle,
      xHandle: normalizeXHandle(xHandleRaw != null ? String(xHandleRaw) : null),
      avatarUrl,
      creatorOnboardedAt: new Date(),
    });
  } catch (err) {
    // isHandleAvailable above closes most of the window, not all of it —
    // two submits for the same handle landing between that check and this
    // write is rare but real; surface it the same clean way instead of a
    // 500.
    if (isUniqueConstraintError(err)) {
      return NextResponse.json({ error: "that username is already taken" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, walletAddress: user.walletAddress });
}
