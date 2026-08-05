import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVerdictForAsset } from "@/lib/verdict-generator";

// Works through every currently-unverdicted ACTIVE asset, oldest first,
// one at a time — sequential on purpose (not Promise.all): each call
// checks the daily cap against the same growing log count, so running
// them one after another is what makes "stop once the cap is hit" actually
// correct instead of racing past it. Still admin/manual-triggered only.
export async function POST() {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const unverdicted = await prisma.asset.findMany({
    where: { verdictStatus: null, status: "ACTIVE" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const results: { assetId: string; ok: boolean; reason?: string }[] = [];
  let stoppedEarly = false;

  for (const { id } of unverdicted) {
    const result = await generateVerdictForAsset(id);
    results.push({ assetId: id, ok: result.ok, reason: result.ok ? undefined : result.reason });
    if (!result.ok && result.reason === "daily_cap_reached") {
      stoppedEarly = true;
      break;
    }
  }

  const generated = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok && r.reason === "llm_failed").length;

  return NextResponse.json({
    ok: true,
    totalUnverdicted: unverdicted.length,
    processed: results.length,
    generated,
    failed,
    remaining: unverdicted.length - results.length,
    stoppedEarly,
    results,
  });
}
