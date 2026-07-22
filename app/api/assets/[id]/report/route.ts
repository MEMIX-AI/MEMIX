import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssetById } from "@/lib/assets";

const VALID_REASONS = ["COPYRIGHT", "ILLEGAL", "SPAM", "OTHER"] as const;

// Public report flow — no wallet required (see CLAUDE.md POSISI LEGAL #4:
// every asset needs a report system). Always creates an OPEN Report row;
// review/takedown happens in the admin panel.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => null);
  const reason = body?.reason;
  const detail = typeof body?.detail === "string" ? body.detail.trim() : "";
  const reporterContact =
    typeof body?.reporterContact === "string" && body.reporterContact.trim()
      ? body.reporterContact.trim()
      : null;

  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "invalid reason" }, { status: 400 });
  }
  if (!detail) {
    return NextResponse.json({ error: "detail is required" }, { status: 400 });
  }

  const asset = await getAssetById(params.id);
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.report.create({
    data: {
      assetId: asset.id,
      reason,
      detail,
      reporterContact,
    },
  });

  return NextResponse.json({ ok: true });
}
