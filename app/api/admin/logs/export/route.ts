import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTakedownLogWhere } from "@/lib/takedown-log-query";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Compliance export — CLAUDE.md POSISI LEGAL #4: this is the evidence
// trail for a legal dispute, so unlike the log viewer page it fetches
// every matching row, no cap.
export async function GET(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const where = buildTakedownLogWhere({
    action: searchParams.get("action") ?? undefined,
    actionBy: searchParams.get("actionBy") ?? undefined,
    assetQuery: searchParams.get("assetQuery") ?? undefined,
  });

  const logs = await prisma.takedownLog.findMany({
    where,
    include: { asset: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "id",
    "createdAt",
    "action",
    "actionBy",
    "targetWallet",
    "assetId",
    "assetTitle",
    "relatedReportId",
    "reason",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.action,
    log.actionBy,
    log.targetWallet ?? "",
    log.assetId ?? "",
    log.asset?.title ?? "",
    log.relatedReportId ?? "",
    log.reason,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvCell(String(cell))).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="takedown-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
