import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "a reason is required" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: "DISMISSED",
      reviewNote: reason,
      reviewedBy: admin.walletAddress,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
