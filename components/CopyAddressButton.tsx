"use client";

import { useState } from "react";
import { Hexagon, Check, Copy } from "lucide-react";
import { shortenWallet } from "@/lib/format";

export function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can fail (permissions, non-secure context) — the
      // address is already visible as text, so there's nothing broken
      // for the user to recover from, just silently don't flip the
      // "copied" state.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full bg-accent/[0.08] px-3 py-1.5 font-heading text-[13px] text-dim transition-colors duration-150 hover:bg-accent/[0.14]"
    >
      <Hexagon size={12} strokeWidth={2} />
      {shortenWallet(address)}
      {copied ? (
        <Check size={12} strokeWidth={2} className="text-ok" />
      ) : (
        <Copy size={12} strokeWidth={1.75} className="opacity-60" />
      )}
    </button>
  );
}
