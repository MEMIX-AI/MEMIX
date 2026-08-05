import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateVerdictForAsset } from "@/lib/verdict-generator";

// Admin/manual trigger only — the one place lib/verdict-generator.ts ever
// gets called for a single asset. Never wired into the upload flow.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const result = await generateVerdictForAsset(params.id);

  if (result.ok) {
    return NextResponse.json({ ok: true, verdict: result.verdict, usage: result.usage });
  }

  switch (result.reason) {
    case "not_found":
      return NextResponse.json({ ok: false, error: "asset not found" }, { status: 404 });
    case "already_verdicted":
      return NextResponse.json(
        { ok: false, error: "asset already has a verdict — skipped, not regenerated" },
        { status: 409 },
      );
    case "daily_cap_reached":
      return NextResponse.json(
        {
          ok: false,
          error: `daily generation cap reached (${result.usage.used}/${result.usage.cap}) — try again tomorrow`,
          usage: result.usage,
        },
        { status: 429 },
      );
    case "llm_failed":
      return NextResponse.json(
        { ok: false, error: result.error, usage: result.usage },
        { status: 502 },
      );
  }
}
