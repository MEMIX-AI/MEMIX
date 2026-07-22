import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey, hashApiKey } from "@/lib/api-key";

// Session-cookie-authenticated management endpoint for a creator's own
// key — distinct from /api/v1/*, which is key-authenticated and meant for
// external machine callers. Never returns the raw key except right after
// POST creates it; GET only ever returns metadata.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const key = await prisma.apiKey.findUnique({
    where: { ownerWallet: user.walletAddress },
  });

  if (!key) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: {
      tier: key.tier,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      requestCount: key.requestCount,
    },
  });
}

// Generates a new key, replacing any existing one for this wallet (one
// key per wallet, per spec — "generate 1 key"). The raw key is returned
// exactly once, here, and is never retrievable again afterward.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json({ error: "this account is banned" }, { status: 403 });
  }

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  await prisma.apiKey.deleteMany({ where: { ownerWallet: user.walletAddress } });
  const created = await prisma.apiKey.create({
    data: { keyHash, ownerWallet: user.walletAddress },
  });

  return NextResponse.json({
    data: {
      key: rawKey,
      tier: created.tier,
      createdAt: created.createdAt,
    },
  });
}
