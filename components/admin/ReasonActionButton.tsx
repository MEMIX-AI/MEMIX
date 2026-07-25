"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

// Every admin action that must carry a mandatory reason (Takedown /
// Restore / Delete permanently / report Takedown / report Dismiss /
// Ban / Unban) shares this one component — a button that opens a small
// modal requiring free-text before it will POST anywhere.
export function ReasonActionButton({
  label,
  modalTitle,
  url,
  variant = "dim",
  confirmLabel = "confirm",
}: {
  label: string;
  modalTitle: string;
  url: string;
  variant?: "accent" | "dim";
  confirmLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) {
      setError("a reason is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "action failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "action failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setReason("");
          setError(null);
        }}
        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
          variant === "accent"
            ? "gradient-brand text-white shadow-soft hover:shadow-glow"
            : "border border-line bg-white text-dim shadow-soft hover:border-accent/40 hover:text-text"
        }`}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/30 px-4 backdrop-blur-sm"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-line bg-white p-6 shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 font-heading text-lg font-bold text-text">{modalTitle}</p>

            <label
              htmlFor="reason-action-input"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-dim"
            >
              reason (required)
            </label>
            <textarea
              id="reason-action-input"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded-2xl border border-line bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
            />

            {error && (
              <p className="mb-2 flex items-center gap-1.5 text-sm text-warn">
                <AlertCircle size={13} strokeWidth={2.25} />
                {error}
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="gradient-brand flex-1 rounded-full px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-50"
              >
                {submitting ? "submitting..." : confirmLabel}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-full border border-line bg-white px-4 py-2.5 text-dim shadow-soft transition-all duration-200 hover:border-accent/40"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
