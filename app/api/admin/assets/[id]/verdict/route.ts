import { NextRequest, NextResponse } from "next/server";
import type { VerdictStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES: VerdictStatus[] = ["EMERGING", "LIVE", "PEAKING", "FADING", "DATED", "DEAD"];

// Editorial verdict fields (MV—005) — same "no reason modal, no
// TakedownLog" treatment as feature/unfeature: this is curation, not a
// moderation action against the uploader.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  let verdictStatus: VerdictStatus | null = null;
  if (body.verdictStatus != null) {
    const upper = String(body.verdictStatus).toUpperCase();
    if (!VALID_STATUSES.includes(upper as VerdictStatus)) {
      return NextResponse.json(
        { error: `verdictStatus must be one of ${VALID_STATUSES.join(", ")}, or null` },
        { status: 400 },
      );
    }
    verdictStatus = upper as VerdictStatus;
  }

  const peaked = body.peaked == null ? null : String(body.peaked).trim() || null;
  const worksWhen = body.worksWhen == null ? null : String(body.worksWhen).trim() || null;
  const avoidWhen = body.avoidWhen == null ? null : String(body.avoidWhen).trim() || null;

  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { verdictStatus, peaked, worksWhen, avoidWhen },
  });

  return NextResponse.json({
    ok: true,
    verdict: {
      status: updated.verdictStatus,
      peaked: updated.peaked,
      worksWhen: updated.worksWhen,
      avoidWhen: updated.avoidWhen,
    },
  });
}
