"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";

const VERDICT_STATUSES = ["emerging", "live", "peaking", "fading", "dated", "dead"] as const;

export function VerdictEditor({
  assetId,
  verdictStatus,
  peaked,
  worksWhen,
  avoidWhen,
}: {
  assetId: string;
  verdictStatus: string | null;
  peaked: string | null;
  worksWhen: string | null;
  avoidWhen: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(verdictStatus?.toLowerCase() ?? "");
  const [peakedVal, setPeakedVal] = useState(peaked ?? "");
  const [worksWhenVal, setWorksWhenVal] = useState(worksWhen ?? "");
  const [avoidWhenVal, setAvoidWhenVal] = useState(avoidWhen ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/admin/assets/${assetId}/verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verdictStatus: status || null,
          peaked: peakedVal.trim() || null,
          worksWhen: worksWhenVal.trim() || null,
          avoidWhen: avoidWhenVal.trim() || null,
        }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full basis-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-250 ${
          verdictStatus
            ? "border border-accent/30 bg-accent/10 text-accent"
            : "border border-line bg-panel text-dim shadow-soft hover:border-accent/40"
        }`}
      >
        <Gavel size={13} strokeWidth={1.75} />
        {verdictStatus ? `verdict: ${verdictStatus.toLowerCase()}` : "unverdicted — add verdict"}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-line bg-bg p-3.5">
          <label className="text-xs font-medium uppercase tracking-wide text-dim">
            status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
          >
            <option value="">unverdicted (clear)</option>
            {VERDICT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium uppercase tracking-wide text-dim">
            peaked
          </label>
          <input
            value={peakedVal}
            onChange={(e) => setPeakedVal(e.target.value)}
            placeholder="e.g. 2017"
            className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
          />

          <label className="text-xs font-medium uppercase tracking-wide text-dim">
            works when
          </label>
          <textarea
            value={worksWhenVal}
            onChange={(e) => setWorksWhenVal(e.target.value)}
            rows={2}
            placeholder="the context this still lands in"
            className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
          />

          <label className="text-xs font-medium uppercase tracking-wide text-dim">
            avoid when
          </label>
          <textarea
            value={avoidWhenVal}
            onChange={(e) => setAvoidWhenVal(e.target.value)}
            rows={2}
            placeholder="where using it reads as a mistake"
            className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-text outline-none focus:border-accent/50"
          />

          <button
            onClick={save}
            disabled={saving}
            className="gradient-brand mt-1 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow disabled:opacity-50"
          >
            {saving ? "saving…" : "save verdict"}
          </button>
        </div>
      )}
    </div>
  );
}
