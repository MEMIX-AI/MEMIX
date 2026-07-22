import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { contentTypeForExtension } from "@/lib/mime";

// Files stay in storage after a takedown (30-day dispute retention — see
// lib/admin-actions.ts), but a taken-down asset must actually stop being
// reachable, not just disappear from listings. This is the one route that
// serves raw bytes straight from a storage key with no Asset lookup at
// all, so it's the one place that must independently re-check visibility
// — a public fileUrl/thumbnailUrl handed out before a takedown must not
// keep working after one.
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string[] } },
) {
  const key = params.key.join("/");
  const url = `/api/storage/${key}`;

  const asset = await prisma.asset.findFirst({
    where: { OR: [{ fileUrl: url }, { thumbnailUrl: url }] },
    select: { status: true, uploader: { select: { status: true } } },
  });
  if (asset && (asset.status !== "ACTIVE" || asset.uploader?.status === "BANNED")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const data = await storage.read(key);
    const contentType = contentTypeForExtension(path.extname(key));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
