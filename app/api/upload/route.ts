import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { detectAssetType, validateUpload } from "@/lib/upload-rules";
import { generateThumbnail, VIDEO_PLACEHOLDER_THUMBNAIL_URL } from "@/lib/thumbnail";
import {
  CURRENT_TOS_VERSION,
  OWNERSHIP_DECLARATION_TEXT,
  TOS_DECLARATION_TEXT,
} from "@/lib/declaration";
import { getClientIp, hashIp } from "@/lib/ip-hash";

const MAX_TAGS = 8;
const MAX_TITLE_LENGTH = 200;

// The declaration gate (CLAUDE.md POSISI LEGAL #2) is enforced here, not
// just hidden/disabled in the client UI — a request missing either
// checkbox is rejected regardless of what the browser sent.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json(
      { error: "this account is banned and can't upload" },
      { status: 403 },
    );
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title is too long (max ${MAX_TITLE_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const description = String(formData.get("description") ?? "").trim();
  const isOriginal = formData.get("isOriginal") === "true";

  const ownsRights = formData.get("ownsRights") === "true";
  const agreesToTos = formData.get("agreesToTos") === "true";
  if (!ownsRights || !agreesToTos) {
    return NextResponse.json(
      { error: "both declaration checkboxes are required" },
      { status: 400 },
    );
  }

  const rawTags = formData
    .getAll("tags")
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean);
  if (rawTags.length > MAX_TAGS) {
    return NextResponse.json(
      { error: `max ${MAX_TAGS} tags` },
      { status: 400 },
    );
  }
  const tagNames = Array.from(new Set(rawTags));

  const type = detectAssetType(file.type);
  if (!type) {
    return NextResponse.json(
      { error: `unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    );
  }

  const validation = validateUpload(type, file.type, file.size);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const saved = await storage.save({
    buffer,
    originalName: file.name,
    mimeType: file.type,
  });

  let thumbnailUrl: string | null = null;
  if (type === "IMAGE") {
    const thumbBuffer = await generateThumbnail(type, buffer).catch(() => null);
    if (!thumbBuffer) {
      // The original was already written to storage above — clean it up
      // rather than leaving an orphaned file with no Asset row pointing
      // to it (nothing else will ever reference this key).
      await storage.delete(saved.key);
      return NextResponse.json(
        { error: "that image file looks corrupted — try a different file or re-export it" },
        { status: 400 },
      );
    }
    const savedThumb = await storage.save({
      buffer: thumbBuffer,
      originalName: "thumb.webp",
      mimeType: "image/webp",
      folder: "thumbnails",
    });
    thumbnailUrl = savedThumb.key;
  } else if (type === "VIDEO") {
    thumbnailUrl = VIDEO_PLACEHOLDER_THUMBNAIL_URL;
  }

  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const asset = await prisma.asset.create({
    data: {
      title,
      description,
      type,
      fileUrl: saved.key,
      thumbnailUrl,
      fileSize: saved.size,
      isOriginal,
      uploaderWallet: user.walletAddress,
      tags: { connect: tags.map((t) => ({ id: t.id })) },
    },
  });

  // Paper trail: exact declaration text + policy version + timestamp +
  // hashed IP, snapshotted at the moment of agreement (never mutated).
  await prisma.uploadDeclaration.create({
    data: {
      assetId: asset.id,
      uploaderWallet: user.walletAddress,
      declarationText: `${OWNERSHIP_DECLARATION_TEXT}\n\n${TOS_DECLARATION_TEXT}`,
      tosVersion: CURRENT_TOS_VERSION,
      ipHash: hashIp(getClientIp(req.headers)),
    },
  });

  return NextResponse.json({ id: asset.id }, { status: 201 });
}
