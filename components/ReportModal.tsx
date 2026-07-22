"use client";

import { useState } from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "done" ? (
          <>
            <p className="mb-2 text-ok">✓ report received</p>
            <p className="mb-4 text-sm text-dim">
              › thanks — a moderator will take a look. this stays in the
              queue with a timestamp until it&apos;s reviewed.
            </p>
            <button
              onClick={onClose}
              className="rounded border border-line px-3 py-1 hover:border-accent"
            >
              close
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="mb-4 text-accent">▍ report this asset</p>

            <label className="mb-1 block text-xs uppercase text-dim">
              reason
            </label>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`rounded border px-2 py-1 text-sm ${
                    reason === r.value
                      ? "border-accent text-accent"
                      : "border-line text-dim"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="report-detail"
              className="mb-1 block text-xs uppercase text-dim"
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
              className="mb-4 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />

            <label
              htmlFor="report-email"
              className="mb-1 block text-xs uppercase text-dim"
            >
              email (optional)
            </label>
            <input
              id="report-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="for follow-up, if you want one"
              className="mb-4 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />

            {status === "error" && (
              <p className="mb-4 text-sm text-dim">
                ✕ something went wrong, try again.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex-1 rounded bg-accent px-4 py-2 font-bold text-bg disabled:opacity-60"
              >
                {status === "submitting" ? "sending..." : "submit report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-line px-4 py-2 text-dim hover:border-accent"
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
