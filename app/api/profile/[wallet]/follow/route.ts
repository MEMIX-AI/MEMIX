import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

// Real wallet-to-wallet follow — requires a connected, signed-in wallet
// (unlike LikeButton's browser-only identity), since a Followers count
// feeding creator rankings needs a harder-to-game identity than
// localStorage. followerWallet is always the current session's own, same
// self-service-only rule as app/api/profile/route.ts.
export async function POST(
  _req: Request,
  { params }: { params: { wallet: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required to follow" }, { status: 401 });
  }
  if (!WALLET_RE.test(params.wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  const followingWallet = params.wallet.toLowerCase();
  if (followingWallet === user.walletAddress) {
    return NextResponse.json({ error: "you can't follow yourself" }, { status: 400 });
  }

  await prisma.follow
    .create({ data: { followerWallet: user.walletAddress, followingWallet } })
    .catch((err) => {
      // Unique constraint — already following, treat as a no-op success
      // rather than an error (idempotent, matches a double-click/retry).
      if (!isUniqueConstraintError(err)) throw err;
    });

  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { wallet: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required to unfollow" }, { status: 401 });
  }
  if (!WALLET_RE.test(params.wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  const followingWallet = params.wallet.toLowerCase();

  await prisma.follow.deleteMany({
    where: { followerWallet: user.walletAddress, followingWallet },
  });

  return NextResponse.json({ ok: true, following: false });
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
