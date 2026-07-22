"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="rounded border border-accent bg-panel p-6">
        <p className="mb-2 text-accent">▍ your new key (shown once)</p>
        <p className="mb-3 text-sm text-dim">
          › copy this now — it can&apos;t be shown again. losing it means
          generating a new one, which invalidates this one.
        </p>
        <div className="mb-3 break-all rounded border border-line bg-bg px-3 py-2 font-bold">
          {revealedKey}
        </div>
        <button
          onClick={copy}
          className="rounded border border-line px-3 py-1 text-sm hover:border-accent"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
        <button
          onClick={() => {
            setRevealedKey(null);
            router.refresh();
          }}
          className="ml-2 rounded border border-line px-3 py-1 text-sm text-dim hover:border-accent"
        >
          done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-line bg-panel p-6">
      {hasKey ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line text-sm">
            <div className="bg-panel px-3 py-2">
              <p className="mb-1 text-[10px] uppercase text-dim">tier</p>
              <p className="font-bold">{tier?.toLowerCase().replace("_", " ")}</p>
            </div>
            <div className="bg-panel px-3 py-2">
              <p className="mb-1 text-[10px] uppercase text-dim">requests made</p>
              <p className="font-bold">{requestCount}</p>
            </div>
            <div className="bg-panel px-3 py-2">
              <p className="mb-1 text-[10px] uppercase text-dim">created</p>
              <p className="font-bold">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="bg-panel px-3 py-2">
              <p className="mb-1 text-[10px] uppercase text-dim">last used</p>
              <p className="font-bold">
                {lastUsedAt ? new Date(lastUsedAt).toLocaleString() : "never"}
              </p>
            </div>
          </div>

          <p className="mb-3 text-sm text-dim">
            › the key itself isn&apos;t shown again — this is just usage.
          </p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="rounded border border-line px-3 py-1 text-sm text-dim hover:border-accent hover:text-text"
            >
              regenerate
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-dim">
                this invalidates the current key immediately —
              </span>
              <button
                onClick={generate}
                disabled={generating}
                className="rounded border border-accent px-2 py-0.5 text-accent hover:bg-accent hover:text-bg disabled:opacity-50"
              >
                {generating ? "generating..." : "confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={generating}
                className="text-dim hover:text-text"
              >
                cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-dim">
            › no key yet. generate one to hit /api/v1/* endpoints.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="rounded bg-accent px-4 py-2 font-bold text-bg disabled:opacity-50"
          >
            {generating ? "generating..." : "$ generate key"}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-dim">✕ {error}</p>}
    </div>
  );
}
