import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { isAdminWallet } from "./admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";

export interface CurrentUser {
  walletAddress: string;
  isAdmin: boolean;
  status: "ACTIVE" | "BANNED";
}

/**
 * Reads and verifies the session cookie, then re-derives admin status live
 * from ADMIN_WALLETS and ban status live from the DB. Never trusts stale
 * claims — a session token only proves *which wallet* signed in; every
 * request recomputes what that wallet is currently allowed to do.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { walletAddress: session.walletAddress },
  });
  if (!user) return null;

  return {
    walletAddress: user.walletAddress,
    isAdmin: isAdminWallet(user.walletAddress),
    status: user.status,
  };
}
