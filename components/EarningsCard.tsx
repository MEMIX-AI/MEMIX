"use client";

import { useEffect, useState } from "react";
import { Wallet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCompactNumber, shortenWallet } from "@/lib/format";

interface Balance {
  totalEarnedMix: number;
  totalWithdrawnMix: number;
  availableMix: number;
}

// Owner-only (see app/u/[wallet]/page.tsx — only rendered when isOwner,
// which already implies a real connected+signed-in session, so there's
// no separate "connect wallet" gate needed here). Self-fetches rather
// than taking server props because a withdraw click must immediately
// reflect the new real balance, not a stale number from page load.
export function EarningsCard({ walletAddress }: { walletAddress: string }) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function loadBalance() {
    setLoading(true);
    try {
      const res = await fetch("/api/creator/earnings");
      const data = await res.json();
      if (res.ok) setBalance(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBalance();
  }, []);

  async function withdraw() {
    setWithdrawing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/creator/withdraw", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ kind: "ok", text: `sent ${formatCompactNumber(data.amountMix)} $MIX to your wallet.` });
        await loadBalance();
      } else {
        setMessage({ kind: "error", text: data.error ?? "withdrawal failed" });
      }
    } catch {
      setMessage({ kind: "error", text: "couldn't reach the server — try again" });
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="glass relative overflow-hidden rounded-[24px] border border-line p-6 shadow-soft-lg sm:p-7">
      <div
        className="absolute inset-x-0 top-0 h-16 opacity-60"
        style={{ background: "linear-gradient(120deg, var(--accent-3), var(--accent))" }}
      />
      <div className="relative flex items-center gap-2 text-sm font-semibold text-text">
        <Wallet size={16} strokeWidth={1.75} className="text-accent" />
        Creator Earnings
      </div>

      {loading ? (
        <div className="relative mt-6 flex items-center gap-2 text-sm text-dim">
          <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />
          loading your real balance…
        </div>
      ) : balance ? (
        <>
          <div className="relative mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-line bg-bg/60 px-3 py-3 text-center">
              <p className="font-heading text-lg font-bold text-accent-2">
                {formatCompactNumber(balance.totalEarnedMix)}
              </p>
              <p className="text-[10.5px] uppercase tracking-wide text-faint">Total earned</p>
            </div>
            <div className="rounded-2xl border border-line bg-bg/60 px-3 py-3 text-center">
              <p className="font-heading text-lg font-bold text-text">
                {formatCompactNumber(balance.availableMix)}
              </p>
              <p className="text-[10.5px] uppercase tracking-wide text-faint">Available</p>
            </div>
            <div className="rounded-2xl border border-line bg-bg/60 px-3 py-3 text-center">
              <p className="font-heading text-lg font-bold text-dim">
                {formatCompactNumber(balance.totalWithdrawnMix)}
              </p>
              <p className="text-[10.5px] uppercase tracking-wide text-faint">Withdrawn</p>
            </div>
          </div>

          <button
            onClick={withdraw}
            disabled={withdrawing || balance.availableMix <= 0}
            className="gradient-brand relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-50"
          >
            {withdrawing && <Loader2 size={15} strokeWidth={1.75} className="animate-spin" />}
            {withdrawing
              ? "sending on-chain…"
              : balance.availableMix > 0
                ? `Withdraw ${formatCompactNumber(balance.availableMix)} $MIX`
                : "Nothing to withdraw yet"}
          </button>

          {message && (
            <p
              className={`relative mt-3 flex items-center gap-1.5 text-xs ${message.kind === "ok" ? "text-ok" : "text-warn"}`}
            >
              {message.kind === "ok" ? (
                <CheckCircle2 size={13} strokeWidth={1.75} />
              ) : (
                <AlertCircle size={13} strokeWidth={1.75} />
              )}
              {message.text}
            </p>
          )}

          <p className="relative mt-3 text-[11.5px] text-faint">
            paid out to {shortenWallet(walletAddress)} · every withdrawal is a real on-chain transfer
          </p>
        </>
      ) : (
        <p className="relative mt-5 text-sm text-dim">couldn&apos;t load your balance right now.</p>
      )}
    </div>
  );
}
