import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { getAssetById } from "@/lib/assets";
import { contentTypeForExtension } from "@/lib/mime";

// No login, no wallet, no page in between — a plain link straight to this
// route triggers the browser's native download (see CLAUDE.md KONSEP INTI:
// "Semua bisa search & download tanpa login, tanpa wallet, tanpa bayar").
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const asset = await getAssetById(params.id);
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Count the request, not confirmed delivery of every byte — a fine
  // simplification for a simple counter like this.
  await prisma.asset.update({
    where: { id: asset.id },
    data: { downloadCount: { increment: 1 } },
  });

  const key = asset.fileUrl.replace(/^\/api\/storage\//, "");
  const data = await storage.read(key);
  const ext = path.extname(key);

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeForExtension(ext),
      "Content-Disposition": `attachment; filename="${slugify(asset.title)}${ext}"`,
    },
  });
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "download";
}
