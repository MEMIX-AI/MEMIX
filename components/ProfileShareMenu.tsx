"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Check, Copy, X as XIcon } from "lucide-react";

// Same "no fake Discord web-intent" reasoning as components/ShareMenu.tsx
// (the per-asset share menu) — kept as a separate component rather than
// reused because that one is asset-specific (builds its own /asset/:id
// URL from an assetId+title pair); this one shares an already-known
// profile URL instead.
export function ProfileShareMenu({ url, text }: { url: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard can fail silently — url is already shown in the address bar
    }
  }

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Share"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-dim transition-colors hover:text-accent"
      >
        <Share2 size={15} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-line shadow-soft-lg"
        >
          <a
            href={tweetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-text transition-colors hover:bg-accent/[0.08]"
          >
            <XIcon size={14} strokeWidth={2} />
            Share to X
          </a>
          <button
            onClick={copyLink}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-text transition-colors hover:bg-accent/[0.08]"
          >
            {copied ? (
              <Check size={14} strokeWidth={2} className="text-ok" />
            ) : (
              <Copy size={14} strokeWidth={1.75} />
            )}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
