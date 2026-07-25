import { NextRequest, NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";
import { prisma } from "@/lib/prisma";
import { isAdminWallet } from "@/lib/admin";
import {
  NONCE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { message, signature } = body ?? {};

  if (typeof message !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const nonce = req.cookies.get(NONCE_COOKIE_NAME)?.value;
  if (!nonce) {
    return NextResponse.json(
      { error: "nonce expired, please try signing in again" },
      { status: 400 },
    );
  }
  if (!message.includes(nonce)) {
    return NextResponse.json({ error: "nonce mismatch" }, { status: 400 });
  }

  // The wallet address comes from recovering the signer of `message` —
  // never from a client-supplied field — so it can't be spoofed.
  const recovered = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  }).catch(() => null);

  if (!recovered) {
    return NextResponse.json(
      { error: "signature verification failed" },
      { status: 401 },
    );
  }

  const walletAddress = recovered.toLowerCase();
  const role = isAdminWallet(walletAddress) ? "ADMIN" : "VISITOR_CREATOR";

  const user = await prisma.user.upsert({
    where: { walletAddress },
    update: { role },
    create: { walletAddress, role },
  });

  const token = await createSessionToken(walletAddress);

  const res = NextResponse.json({
    walletAddress: user.walletAddress,
    isAdmin: isAdminWallet(user.walletAddress),
    status: user.status,
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // See app/api/auth/nonce/route.ts for why this is keyed off the
    // actual request protocol, not NODE_ENV.
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Nonce is single-use — clear it so the signed message can't be replayed.
  res.cookies.set(NONCE_COOKIE_NAME, "", { maxAge: 0, path: "/" });

  return res;
}
