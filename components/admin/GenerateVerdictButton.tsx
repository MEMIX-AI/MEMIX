"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

// Only ever rendered for an asset with no verdict yet (see
// app/admin/assets/page.tsx) — the generator itself also refuses to
// overwrite an existing verdict, this just keeps the button from
// appearing where it'd always be a no-op.
export function GenerateVerdictButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/assets/${assetId}/verdict/generate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setMessage(`generated (${data.verdict.status.toLowerCase()}) — ${data.usage.used}/${data.usage.cap} used today`);
        router.refresh();
      } else {
        setMessage(data?.error ?? "generation failed");
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
        {loading ? "generating…" : "generate verdict (AI)"}
      </button>
      {message && <p className="max-w-xs text-xs text-dim">{message}</p>}
    </div>
  );
}
