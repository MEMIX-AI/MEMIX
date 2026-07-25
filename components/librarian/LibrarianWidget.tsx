"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Asset, Tag } from "@prisma/client";
import { Sparkles, X, Send } from "lucide-react";
import { AssetCard } from "@/components/AssetCard";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  assets?: (Asset & { tags: Tag[] })[];
};

// Floating chat button + panel, present on every public page (hidden on
// /admin — that's an internal tool surface, not the public-facing
// library). Fully read-only against the library — see
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
        className="gradient-brand fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-soft-lg transition-all duration-200 hover:shadow-glow hover:scale-105"
      >
        {open ? <X size={22} strokeWidth={2.25} /> : <Sparkles size={22} strokeWidth={2.25} />}
      </button>

      {open && (
        <div className="glass fixed bottom-24 right-6 z-40 flex h-[70vh] max-h-[600px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-[24px] border border-line shadow-soft-lg">
          <div className="gradient-brand flex items-center justify-between px-5 py-3.5 text-sm text-white">
            <span className="flex items-center gap-1.5 font-heading font-semibold">
              <Sparkles size={14} strokeWidth={2.25} />
              librarian
            </span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-panel" />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-sm">
            {messages.length === 0 && (
              <p className="text-dim">
                hey. ask me to find a sound, a reaction template, whatever
                — or ask what&apos;s trending.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} className="mb-3.5">
                {m.role === "user" ? (
                  <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md gradient-brand px-3.5 py-2 text-white">
                    {m.content}
                  </p>
                ) : (
                  <>
                    <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-panel px-3.5 py-2 text-text shadow-soft">
                      {m.content}
                    </p>
                    {m.assets && m.assets.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                        {m.assets.map((asset) => (
                          <AssetCard key={asset.id} asset={asset} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {sending && <p className="text-dim">thinking…</p>}
            {error && <p className="text-warn">{error}</p>}
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-panel/60 px-3.5 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="find a fail sound effect"
              disabled={sending}
              className="flex-1 rounded-full border border-line bg-panel px-4 py-2 text-sm text-text outline-none transition-colors placeholder:text-dim focus:border-accent/50"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="send"
              className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-soft transition-all duration-200 hover:shadow-glow disabled:opacity-40"
            >
              <Send size={15} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
