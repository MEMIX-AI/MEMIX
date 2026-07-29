"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/config";
import { useLibrarianOpen } from "@/components/librarian/LibrarianOpenContext";

const PRODUCT_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/upload", label: "Upload" },
  { href: "/creators", label: "Creators" },
];

// "Status" has no real page yet — rendered as inert text rather than a
// link to nowhere, same "don't claim a destination that doesn't exist"
// rule as everything else in this redesign.
const RESOURCE_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/docs", label: "API" },
  { href: "/roadmap", label: "Roadmap" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/takedown", label: "Takedown" },
  { href: "/creators", label: "Creator Program" },
];

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-1.5 transition-colors duration-200 hover:text-text"
    >
      {label}
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-white/50 shadow-soft transition-all duration-200 group-hover:border-accent/40 group-hover:text-accent group-hover:shadow-glow">
        <ArrowUpRight size={11} strokeWidth={2} />
      </span>
    </a>
  );
}

export function Footer() {
  const { setOpen } = useLibrarianOpen();

  return (
    <footer className="glass border-t border-white/40 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="mb-2 flex items-center gap-2 font-heading text-base font-bold">
              <span className="gradient-logo flex h-6 w-6 items-center justify-center rounded-full text-white shadow-soft">
                <Sparkles size={12} strokeWidth={2} />
              </span>
              <span className="gradient-logo-text">memix</span>
            </Link>
            <p className="max-w-[220px] text-xs leading-relaxed text-dim">
              The meme catalogue that returns a verdict, not just a file.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-dim">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-text/70">Product</p>
            {PRODUCT_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition-colors duration-200 hover:text-text">
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => setOpen(true)}
              className="text-left transition-colors duration-200 hover:text-text"
            >
              AI Agent
            </button>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-dim">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-text/70">Resources</p>
            {RESOURCE_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition-colors duration-200 hover:text-text">
                {l.label}
              </Link>
            ))}
            <span className="cursor-default text-dim/50">Status</span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm text-dim">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-text/70">Community</p>
            {SOCIAL_LINKS.github && <ExternalLink href={SOCIAL_LINKS.github} label="GitHub" />}
            {SOCIAL_LINKS.x && <ExternalLink href={SOCIAL_LINKS.x} label="X" />}
            {SOCIAL_LINKS.discord && <ExternalLink href={SOCIAL_LINKS.discord} label="Discord" />}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-dim">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="transition-colors duration-200 hover:text-text">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-dim">© 2026 Memix. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
