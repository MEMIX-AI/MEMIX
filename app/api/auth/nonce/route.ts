import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { NONCE_COOKIE_NAME, NONCE_MAX_AGE } from "@/lib/session";

// Must generate a fresh random value and a fresh Set-Cookie on every
// single call — with no dynamic data source (no cookies()/headers() read,
// no DB call), Next.js's App Router statically optimizes this route by
// default (confirmed in the build output: "○ /api/auth/nonce"), which
// froze the SAME nonce + Set-Cookie into every response in production
// (`next start`) — invisible under `next dev`, which never applies that
// optimization, which is exactly why this went unnoticed until testing
// against a real production build.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const nonce = randomBytes(16).toString("hex");

  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE_NAME, nonce, {
    httpOnly: true,
    sameSite: "lax",
    // Keyed off the actual request, not NODE_ENV — a `Secure` cookie is
    // silently dropped by the browser over plain HTTP (e.g. testing on a
    // real phone against a local-network IP like http://192.168.x.x:3001
    // while running a production build), breaking the whole sign-in flow
    // with no useful error. Real HTTPS deploys (Vercel) still get it.
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: NONCE_MAX_AGE,
  });
  return res;
}
