import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCreatorBalance } from "@/lib/treasury";

// Self-service only, same rule as app/api/profile/route.ts — a creator's
// real ledger balance is never exposed for a wallet other than the
// current session's own.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  const balance = await getCreatorBalance(user.walletAddress);
  return NextResponse.json({ ok: true, ...balance });
}
