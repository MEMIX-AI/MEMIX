"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Check, Copy, AlertCircle } from "lucide-react";

interface ApiKeyPanelProps {
  hasKey: boolean;
  tier: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
}

export function ApiKeyPanel({
  hasKey,
  tier,
  createdAt,
  lastUsedAt,
  requestCount,
}: ApiKeyPanelProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/account/api-key", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "couldn't generate a key");
      setRevealedKey(data.data.key);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't generate a key");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (revealedKey) {
    return (
      <div className="rounded-[24px] border border-accent/30 bg-white p-6 shadow-soft-lg">
        <p className="mb-2 flex items-center gap-2 font-heading font-bold text-accent">
          <KeyRound size={18} strokeWidth={2.25} />
          your new key (shown once)
        </p>
        <p className="mb-4 text-sm leading-relaxed text-dim">
          copy this now — it can&apos;t be shown again. losing it means
          generating a new one, which invalidates this one.
        </p>
        <div className="mb-4 break-all rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-sm font-medium text-text">
          {revealedKey}
        </div>
        <button
          onClick={copy}
          className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium shadow-soft transition-all duration-200 hover:border-accent/40"
        >
          {copied ? <Check size={14} strokeWidth={2.5} className="text-ok" /> : <Copy size={14} strokeWidth={2.25} />}
          {copied ? "copied" : "copy"}
        </button>
        <button
          onClick={() => {
            setRevealedKey(null);
            router.refresh();
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-dim hover:text-text"
        >
          done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-line bg-white p-6 shadow-soft">
      {hasKey ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-2.5 text-sm">
            <div className="rounded-xl bg-bg px-3.5 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dim">tier</p>
              <p className="font-heading font-semibold text-text">{tier?.toLowerCase().replace("_", " ")}</p>
            </div>
            <div className="rounded-xl bg-bg px-3.5 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dim">requests made</p>
              <p className="font-heading font-semibold text-text">{requestCount}</p>
            </div>
            <div className="rounded-xl bg-bg px-3.5 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dim">created</p>
              <p className="font-heading font-semibold text-text">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-bg px-3.5 py-2.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dim">last used</p>
              <p className="font-heading font-semibold text-text">
                {lastUsedAt ? new Date(lastUsedAt).toLocaleString() : "never"}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm text-dim">
            the key itself isn&apos;t shown again — this is just usage.
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-dim shadow-soft transition-all duration-200 hover:border-accent/40 hover:text-text"
            >
              regenerate
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 text-sm">
              <span className="text-dim">
                this invalidates the current key immediately —
              </span>
              <button
                onClick={generate}
                disabled={generating}
                className="gradient-brand rounded-full px-3.5 py-1.5 font-medium text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-50"
              >
                {generating ? "generating..." : "confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={generating}
                className="font-medium text-dim hover:text-text"
              >
                cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-dim">
            no key yet. generate one to hit /api/v1/* endpoints.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="gradient-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-50"
          >
            <KeyRound size={16} strokeWidth={2.25} />
            {generating ? "generating..." : "generate key"}
          </button>
        </>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-warn">
          <AlertCircle size={14} strokeWidth={2.25} />
          {error}
        </p>
      )}
    </div>
  );
}
