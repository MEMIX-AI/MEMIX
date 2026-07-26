import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { getAssetById } from "@/lib/assets";
import { getClientIp, hashIp } from "@/lib/ip-hash";

// No login, no wallet, no page in between — a plain link straight to this
// route triggers the browser's native download (see CLAUDE.md KONSEP INTI:
// "Semua bisa search & download tanpa login, tanpa wallet, tanpa bayar").
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const asset = await getAssetById(params.id);
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Count the request, not confirmed delivery of every byte — a fine
  // simplification for both of these. downloadCount stays a simple
  // lifetime counter (shown on the asset detail page); the DownloadEvent
  // row is what powers the real rolling-window trending calc in
  // lib/assets.ts#getTrendingAssets. This is the only place either gets
  // written, so "a download" has exactly one definition app-wide.
  await Promise.all([
    prisma.asset.update({
      where: { id: asset.id },
      data: { downloadCount: { increment: 1 } },
    }),
    prisma.downloadEvent.create({
      data: { assetId: asset.id, ipHash: hashIp(getClientIp(req)) },
    }),
  ]);

  // asset.fileUrl is a bare storage key (not a resolved URL — see
  // lib/storage.ts) precisely so this works unchanged regardless of which
  // StorageAdapter is active. Against Supabase Storage, `getUrl` mints a
  // short-lived signed URL rather than bytes we could stream ourselves —
  // `downloadFilename` asks Supabase to set Content-Disposition on that
  // signed URL's response, so the clean-filename download behavior is
  // preserved even though this route no longer reads the bytes itself.
  const key = asset.fileUrl;
  const ext = path.extname(key);
  const url = await storage.getUrl(key, { downloadFilename: `${slugify(asset.title)}${ext}` });

  return NextResponse.redirect(url, { status: 307 });
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "download";
}
