"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        className={`rounded border px-3 py-1 text-sm ${
          variant === "accent"
            ? "border-accent text-accent hover:bg-accent hover:text-bg"
            : "border-line text-dim hover:border-accent hover:text-text"
        }`}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded border border-line bg-panel p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-accent">▍ {modalTitle}</p>

            <label
              htmlFor="reason-action-input"
              className="mb-1 block text-xs uppercase text-dim"
            >
              reason (required)
            </label>
            <textarea
              id="reason-action-input"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mb-2 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />

            {error && <p className="mb-2 text-sm text-dim">✕ {error}</p>}

            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded bg-accent px-4 py-2 font-bold text-bg disabled:opacity-50"
              >
                {submitting ? "submitting..." : confirmLabel}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded border border-line px-4 py-2 text-dim hover:border-accent"
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
