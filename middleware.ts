import { NextRequest, NextResponse } from "next/server";
import { isAdminWallet } from "@/lib/admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

// Runs on Edge — only touches env vars + a JWT verify, no DB/fs access, so
// it can't reach Prisma. This is the first gate; the page/route itself
// re-checks via lib/auth.ts (which does hit the DB) as defense in depth.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAdmin = session ? isAdminWallet(session.walletAddress) : false;

  if (isAdmin) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
