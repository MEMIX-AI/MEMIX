"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Asset, Tag } from "@prisma/client";
import { AssetCard } from "@/components/AssetCard";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  assets?: (Asset & { tags: Tag[] })[];
};

// Floating chat button + terminal-style panel, present on every public
// page (hidden on /admin — that's an internal tool surface, not the
// public-facing library). Fully read-only against the library — see
// lib/librarian-prompt.ts and app/api/librarian/route.ts.
export function LibrarianWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  if (pathname?.startsWith("/admin")) return null;

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setSending(true);

    try {
      const res = await fetch("/api/librarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "the librarian is unreachable right now — try again in a bit");
      }
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply, assets: data.assets },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "the librarian is unreachable right now — try again in a bit",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "close the librarian" : "open the librarian"}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-panel text-xl text-accent shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:border-accent"
      >
        {open ? "✕" : "▸"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded border border-line bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm">
            <span className="text-accent">▸ librarian</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 text-sm">
            {messages.length === 0 && (
              <p className="text-dim">
                › hey. ask me to find a sound, a reaction template, whatever
                — or ask what&apos;s trending.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className="mb-3">
                {m.role === "user" ? (
                  <p className="text-text">
                    <span className="text-accent">$</span> {m.content}
                  </p>
                ) : (
                  <>
                    <p className="text-dim">› {m.content}</p>
                    {m.assets && m.assets.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {m.assets.map((asset) => (
                          <AssetCard key={asset.id} asset={asset} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {sending && <p className="text-dim">› ...</p>}
            {error && <p className="text-dim">✕ {error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            <span className="text-accent">$</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="find a fail sound effect"
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-dim"
            />
          </div>
        </div>
      )}
    </>
  );
}
