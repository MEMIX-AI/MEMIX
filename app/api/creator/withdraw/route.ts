import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeWithdrawal } from "@/lib/treasury";

// Self-service only. Withdraws the caller's ENTIRE available balance in
// one go (no partial-amount input) — see lib/treasury.ts#executeWithdrawal
// for the actual reserve-then-send logic and its double-spend guard.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.status === "BANNED") {
    return NextResponse.json({ error: "this account is banned" }, { status: 403 });
  }

  const result = await executeWithdrawal(user.walletAddress);

  if (result.ok) {
    return NextResponse.json({ ok: true, amountMix: result.amountMix, txHash: result.txHash });
  }

  switch (result.reason) {
    case "not_configured":
      return NextResponse.json(
        { ok: false, error: "withdrawals aren't configured yet — try again later" },
        { status: 503 },
      );
    case "nothing_to_withdraw":
      return NextResponse.json({ ok: false, error: "no available balance to withdraw" }, { status: 400 });
    case "rpc_unavailable":
      return NextResponse.json(
        { ok: false, error: "couldn't reach the chain right now — nothing was sent, try again shortly" },
        { status: 503 },
      );
    case "send_failed":
      return NextResponse.json(
        { ok: false, error: `the payout didn't go through (${result.detail}) — your balance is unaffected, try again` },
        { status: 502 },
      );
  }
}
