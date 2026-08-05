"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

// Works through every unverdicted ACTIVE asset in one request, respecting
// the same daily cap the per-asset button does (lib/verdict-generator.ts)
// — for clearing a backlog of legacy unverdicted assets without clicking
// one at a time. Still entirely admin-triggered, never automatic.
export function GenerateVerdictsBatchButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/verdicts/generate-batch", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setMessage(
          `generated ${data.generated}/${data.processed} (${data.totalUnverdicted} unverdicted total)` +
            (data.stoppedEarly ? " — stopped: daily cap reached" : "") +
            (data.failed > 0 ? ` — ${data.failed} failed, see admin logs` : ""),
        );
        router.refresh();
      } else {
        setMessage(data?.error ?? "batch generation failed");
      }
    } catch {
      setMessage("network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-sm font-medium text-accent transition-all duration-250 hover:border-accent/50 disabled:opacity-60"
      >
        <Sparkles size={13} strokeWidth={1.75} />
        {loading ? "generating…" : "generate all unverdicted (AI)"}
      </button>
      {message && <p className="max-w-md text-xs text-dim">{message}</p>}
    </div>
  );
}
