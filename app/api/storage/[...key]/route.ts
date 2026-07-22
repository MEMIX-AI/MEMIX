import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { storage } from "@/lib/storage";
import { contentTypeForExtension } from "@/lib/mime";

export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string[] } },
) {
  const key = params.key.join("/");

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
