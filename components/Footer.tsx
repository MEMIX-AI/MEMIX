"use client";

import Link from "next/link";
import Image from "next/image";
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

const CONTACT_EMAIL = "memix631@gmail.com";

function SocialIcon({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white/[0.04] text-[13px] font-semibold text-dim transition-all duration-200 hover:-translate-y-0.5 hover:text-accent"
    >
      {label}
    </a>
  );
}

export function Footer() {
  const { setOpen } = useLibrarianOpen();

  return (
    <footer className="glass border-t border-line px-6 py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="mb-3 flex items-center gap-2.5 font-heading text-lg font-bold">
              <Image
                src="/logo-memix.png"
                alt="memix"
                width={26}
                height={26}
                className="h-[26px] w-[26px] shrink-0 rounded-full"
              />
              <span className="gradient-logo-text">memix</span>
            </Link>
            <p className="max-w-[250px] text-[13.5px] leading-relaxed text-dim">
              The meme catalogue that returns a verdict, not just a file.
            </p>
            <div className="mt-4 flex gap-[9px]">
              {SOCIAL_LINKS.x && <SocialIcon href={SOCIAL_LINKS.x} label="𝕏" />}
              {SOCIAL_LINKS.discord && <SocialIcon href={SOCIAL_LINKS.discord} label="D" />}
              {SOCIAL_LINKS.github && <SocialIcon href={SOCIAL_LINKS.github} label="GH" />}
              <SocialIcon href={`mailto:${CONTACT_EMAIL}`} label="@" />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-dim">Product</p>
            {PRODUCT_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => setOpen(true)}
              className="text-left text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100"
            >
              AI Agent
            </button>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-dim">Resources</p>
            {RESOURCE_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                {l.label}
              </Link>
            ))}
            <span className="cursor-default text-dim/50">Status</span>
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-dim">Community</p>
            {SOCIAL_LINKS.github && (
              <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer" className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                GitHub
              </a>
            )}
            {SOCIAL_LINKS.x && (
              <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                X · @Memixzwg
              </a>
            )}
            {SOCIAL_LINKS.discord && (
              <a href={SOCIAL_LINKS.discord} target="_blank" rel="noopener noreferrer" className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                Discord
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2.5 text-sm">
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-dim">Legal</p>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-text/80 transition-opacity duration-150 hover:text-accent hover:opacity-100">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Memix. All rights reserved.</span>
          <span>Other meme APIs return a file. This one returns a judgment.</span>
        </div>
      </div>
    </footer>
  );
}
