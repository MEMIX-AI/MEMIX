"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const REASONS = [
  { value: "COPYRIGHT", label: "copyright" },
  { value: "ILLEGAL", label: "illegal" },
  { value: "SPAM", label: "spam" },
  { value: "OTHER", label: "other" },
] as const;

export function ReportModal({
  assetId,
  onClose,
}: {
  assetId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>(
    "COPYRIGHT",
  );
  const [detail, setDetail] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(`/api/assets/${assetId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          detail,
          reporterContact: email || undefined,
        }),
      });
      if (!res.ok) throw new Error("report failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-text/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] border border-line bg-panel p-6 shadow-soft-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "done" ? (
          <>
            <p className="mb-2 flex items-center gap-2 font-heading font-bold text-ok">
              <CheckCircle2 size={20} strokeWidth={2.25} />
              report received
            </p>
            <p className="mb-5 text-sm leading-relaxed text-dim">
              thanks — a moderator will take a look. this stays in the
              queue with a timestamp until it&apos;s reviewed.
            </p>
            <button
              onClick={onClose}
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium shadow-soft transition-all duration-200 hover:border-accent/40"
            >
              close
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="mb-5 font-heading text-lg font-bold text-text">report this asset</p>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dim">
              reason
            </label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    reason === r.value
                      ? "gradient-brand text-white shadow-glow"
                      : "border border-line bg-panel text-dim hover:border-accent/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="report-detail"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dim"
            >
              detail
            </label>
            <textarea
              id="report-detail"
              required
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="what's wrong with this asset?"
              className="mb-4 w-full rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
            />

            <label
              htmlFor="report-email"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dim"
            >
              email (optional)
            </label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="for follow-up, if you want one"
              className="mb-4 w-full rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
            />

            {status === "error" && (
              <p className="mb-4 flex items-center gap-1.5 text-sm text-warn">
                <XCircle size={14} strokeWidth={2.25} />
                something went wrong, try again.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="gradient-brand flex-1 rounded-full px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-60"
              >
                {status === "submitting" ? "sending..." : "submit report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line bg-panel px-4 py-2.5 text-dim shadow-soft transition-all duration-200 hover:border-accent/40"
              >
                cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
