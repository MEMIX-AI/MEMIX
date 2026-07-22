import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { banUser } from "@/lib/admin-actions";

export async function POST(
  req: NextRequest,
  { params }: { params: { wallet: string } },
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

  const wallet = params.wallet.toLowerCase();
  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await banUser(wallet, admin.walletAddress, reason);

  return NextResponse.json({ ok: true });
}
