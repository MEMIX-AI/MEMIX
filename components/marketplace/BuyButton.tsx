"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from "wagmi";
import { getAddress } from "viem";
import { ShoppingCart, Download, Loader2 } from "lucide-react";
import { MIX_TOKEN_ADDRESS, ERC20_ABI } from "@/lib/erc20";
import { robinhoodChain } from "@/lib/wagmi-config";

type Step = "idle" | "switching" | "paying-seller" | "paying-treasury" | "verifying" | "done" | "error";

// Option A (non-custodial by design — see the schema comment on
// MarketplacePurchase for why): two plain ERC-20 transfers sent directly
// by the buyer's own wallet (95% to the creator, 5% to the treasury), no
// splitter contract, no platform custody at any point. Whatever this
// component believes about "success" is never trusted on its own —
// every hash gets independently re-verified server-side (app/api/
// marketplace/purchases/[assetId]/route.ts, via lib/marketplace.ts
// reading ROBINHOOD_RPC_URL directly) before any download URL is handed
// back. sellerRaw/feeRaw arrive as strings (a server component can't
// hand a client component a real bigint) computed server-side from the
// listing's real price — this component never recomputes the split
// itself, only relays those exact amounts into the two transactions.
export interface BuyButtonProps {
  assetId: string;
  priceMix: number;
  sellerWallet: string;
  treasuryWallet: string;
  sellerRaw: string;
  feeRaw: string;
}

export function BuyButton({
  assetId,
  priceMix,
  sellerWallet,
  treasuryWallet,
  sellerRaw,
  feeRaw,
}: BuyButtonProps) {
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  // Explicit chainId — wagmi's default publicClient follows whatever
  // chain the wallet is CURRENTLY connected to, which is almost never
  // Robinhood Chain unless the buyer already switched manually. This is
  // what waitForTransactionReceipt below actually needs to be reachable.
  const publicClient = usePublicClient({ chainId: robinhoodChain.id });

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [pendingHashes, setPendingHashes] = useState<{ seller: string; treasury: string } | null>(null);

  async function submitForVerification(sellerTxHash: string, treasuryTxHash: string) {
    setStep("verifying");
    const res = await fetch(`/api/marketplace/purchases/${assetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerTxHash, treasuryTxHash }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      setDownloadUrl(data.downloadUrl);
      setPendingHashes(null);
      setStep("done");
      return;
    }
    if (res.status === 202 && data?.pending) {
      // Mined-but-not-confirmed-enough, or genuinely not mined yet — the
      // exact same two hashes are still good, no need to pay twice.
      setPendingHashes({ seller: sellerTxHash, treasury: treasuryTxHash });
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
      // Explicit, visible switch step — most wallets default to a chain
      // that isn't Robinhood Chain (an unfamiliar custom chain to most
      // of them), and leaving this implicit inside writeContractAsync's
      // own chainId targeting is exactly what silently failed before:
      // no UI ever showed the request was happening, so a stuck/rejected
      // switch just looked like "clicked Buy, nothing happened."
      if (chainId !== robinhoodChain.id) {
        setStep("switching");
        await switchChainAsync({ chainId: robinhoodChain.id });
      }

      setStep("paying-seller");
      const sellerTxHash = await writeContractAsync({
        address: getAddress(MIX_TOKEN_ADDRESS),
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [getAddress(sellerWallet), BigInt(sellerRaw)],
        chainId: robinhoodChain.id,
      });
      await publicClient?.waitForTransactionReceipt({ hash: sellerTxHash });

      setStep("paying-treasury");
      const treasuryTxHash = await writeContractAsync({
        address: getAddress(MIX_TOKEN_ADDRESS),
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [getAddress(treasuryWallet), BigInt(feeRaw)],
        chainId: robinhoodChain.id,
      });
      await publicClient?.waitForTransactionReceipt({ hash: treasuryTxHash });

      await submitForVerification(sellerTxHash, treasuryTxHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "the purchase didn't go through");
      setStep("error");
    }
  }

  function retry() {
    if (!pendingHashes) {
      setStep("idle");
      setError(null);
      return;
    }
    void submitForVerification(pendingHashes.seller, pendingHashes.treasury);
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

  const busy =
    step === "switching" || step === "paying-seller" || step === "paying-treasury" || step === "verifying";

  return (
    <div className="flex flex-col gap-2.5">
      <button
        onClick={pendingHashes ? retry : buy}
        disabled={busy}
        className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={17} strokeWidth={1.75} className="animate-spin" />
        ) : (
          <ShoppingCart size={17} strokeWidth={1.75} />
        )}
        {step === "switching" && "switch to Robinhood Chain in your wallet…"}
        {step === "paying-seller" && "confirm payment to creator…"}
        {step === "paying-treasury" && "confirm platform fee…"}
        {step === "verifying" && "verifying on-chain…"}
        {!busy && pendingHashes && "check payment status"}
        {!busy && !pendingHashes && `buy for ${priceMix.toLocaleString()} $MIX`}
      </button>
      <p className="text-xs text-dim">
        two transactions: {priceMix.toLocaleString()} $MIX splits into a direct payment to the
        creator and a platform fee, sent as two separate transfers from your wallet.
      </p>
      {error && <p className="text-xs text-warn">{error}</p>}
    </div>
  );
}
