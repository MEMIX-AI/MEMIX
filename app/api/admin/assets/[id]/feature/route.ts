import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Editorial curation, not a moderation action — no reason required, no
// TakedownLog entry (see task spec: only Takedown/Restore/Delete are
// listed as requiring the reason modal + log).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await getCurrentUser();
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.featured !== "boolean") {
    return NextResponse.json({ error: "featured must be a boolean" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.asset.update({
    where: { id: asset.id },
    data: { featured: body.featured },
  });

  return NextResponse.json({ ok: true });
}
