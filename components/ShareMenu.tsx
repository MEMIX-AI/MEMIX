"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Copy, Code2 } from "lucide-react";

// Discord has no public web-intent share URL (unlike X), so "Share to
// Discord" just copies a message to paste — same honest-about-what-it-
// actually-does approach as everything else in this redesign.
export function ShareMenu({ assetId, title }: { assetId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"link" | "discord" | "embed" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function assetUrl() {
    return `${window.location.origin}/asset/${assetId}`;
  }

  function shareToX() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(assetUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function copyToClipboard(text: string, kind: "link" | "discord" | "embed") {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-text shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
      >
        <Share2 size={16} strokeWidth={1.75} />
        share
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-panel text-sm shadow-soft-lg">
          <button
            onClick={shareToX}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-text transition-colors hover:bg-bg"
          >
            share to X
          </button>
          <button
            onClick={() => copyToClipboard(`${title} — ${assetUrl()}`, "discord")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-text transition-colors hover:bg-bg"
          >
            {copied === "discord" ? "copied for Discord ✓" : "share to Discord"}
          </button>
          <button
            onClick={() => copyToClipboard(assetUrl(), "link")}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-text transition-colors hover:bg-bg"
          >
            <Copy size={14} className="text-dim" />
            {copied === "link" ? "copied ✓" : "copy link"}
          </button>
          <button
            onClick={() =>
              copyToClipboard(
                `<iframe src="${assetUrl()}" width="400" height="400" frameborder="0"></iframe>`,
                "embed",
              )
            }
            className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-dim transition-colors hover:bg-bg hover:text-text"
          >
            <Code2 size={14} />
            {copied === "embed" ? "embed code copied ✓" : "embed"}
          </button>
        </div>
      )}
    </div>
  );
}
