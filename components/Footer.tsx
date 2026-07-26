import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-line/80 px-6 py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-dim">
          <Link href="/terms" className="transition-colors hover:text-text">
            terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-text">
            privacy
          </Link>
          <Link href="/takedown" className="transition-colors hover:text-text">
            takedown
          </Link>
          <Link href="/tokenomics" className="transition-colors hover:text-text">
            tokenomics
          </Link>
          {SOCIAL_LINKS.github && (
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-text"
            >
              github
              <ArrowUpRight size={13} strokeWidth={2.25} />
            </a>
          )}
          {SOCIAL_LINKS.x && (
            <a
              href={SOCIAL_LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-text"
            >
              x
              <ArrowUpRight size={13} strokeWidth={2.25} />
            </a>
          )}
        </nav>

        <p className="font-mono text-sm text-dim">
          memix :~$<span className="cursor-blink text-accent">▊</span>
        </p>
      </div>
    </footer>
  );
}
