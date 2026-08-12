"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { getAddress } from "viem";
import { ShoppingCart, Download, Loader2 } from "lucide-react";
import { MIX_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/erc20";

type Step = "idle" | "paying" | "verifying" | "done" | "error";

// Custodial model: one plain ERC-20 transfer of the FULL price, sent
// directly by the buyer's own wallet to the treasury. The seller's 95%
// share becomes a real ledger credit (redeemable later via their own
// Withdraw button — see lib/treasury.ts), not a wallet-to-wallet payment
// at purchase time. Whatever this component believes about "success" is
// never trusted on its own — the hash gets independently re-verified
// server-side (app/api/marketplace/purchases/[assetId]/route.ts, via
// lib/marketplace.ts reading ROBINHOOD_RPC_URL directly) before any
// download URL is handed back. totalRaw arrives as a string (a server
// component can't hand a client component a real bigint) computed
// server-side from the listing's real price — this component never
// recomputes it, only relays that exact amount into the transaction.
export function BuyButton({
  assetId,
  priceMix,
  treasuryWallet,
  totalRaw,
}: {
  assetId: string;
  priceMix: number;
  treasuryWallet: string;
  totalRaw: string;
}) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<string | null>(null);

  async function submitForVerification(paymentTxHash: string) {
    setStep("verifying");
    const res = await fetch(`/api/marketplace/purchases/${assetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentTxHash }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      setDownloadUrl(data.downloadUrl);
      setPendingHash(null);
      setStep("done");
      return;
    }
    if (res.status === 202 && data?.pending) {
      // Mined-but-not-confirmed-enough, or genuinely not mined yet — the
      // exact same hash is still good, no need to pay twice.
      setPendingHash(paymentTxHash);
      setError(data.error ?? "still confirming on-chain — try again in a moment");
      setStep("error");
      return;
    }
    setError(data?.error ?? "purchase verification failed");
    setStep("error");
  }

  async function buy() {
    if (!address) return;
    setError(null);
    try {
      setStep("paying");
      const txHash = await writeContractAsync({
        address: getAddress(MIX_TOKEN_ADDRESS),
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [getAddress(treasuryWallet), BigInt(totalRaw)],
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });

      await submitForVerification(txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "the purchase didn't go through");
      setStep("error");
    }
  }

  function retry() {
    if (!pendingHash) {
      setStep("idle");
      setError(null);
      return;
    }
    void submitForVerification(pendingHash);
  }

  if (step === "done" && downloadUrl) {
    return (
      <a
        href={downloadUrl}
        className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
      >
        <Download size={17} strokeWidth={1.75} />
        download your purchase
      </a>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-line bg-panel px-5 py-4 text-sm text-dim shadow-soft">
        connect your wallet (top right) to buy this for {priceMix.toLocaleString()} $MIX.
      </div>
    );
  }

  const busy = step === "paying" || step === "verifying";

  return (
    <div className="flex flex-col gap-2.5">
      <button
        onClick={pendingHash ? retry : buy}
        disabled={busy}
        className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <ShoppingCart size={17} strokeWidth={1.75} />
        )}
        {step === "paying" && "confirm payment…"}
        {step === "verifying" && "verifying on-chain…"}
        {!busy && pendingHash && "check payment status"}
        {!busy && !pendingHash && `buy for ${priceMix.toLocaleString()} $MIX`}
      </button>
      <p className="text-xs text-dim">
        one transaction: {priceMix.toLocaleString()} $MIX, sent straight from your wallet.
      </p>
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
