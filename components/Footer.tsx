import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SOCIAL_LINKS } from "@/lib/config";

export function Footer() {
  return (
    <footer className="glass border-t border-white/40 px-6 py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-dim">
          <Link href="/terms" className="transition-colors duration-250 hover:text-text">
            terms
          </Link>
          <Link href="/privacy" className="transition-colors duration-250 hover:text-text">
            privacy
          </Link>
          <Link href="/takedown" className="transition-colors duration-250 hover:text-text">
            takedown
          </Link>
          <Link href="/tokenomics" className="transition-colors duration-250 hover:text-text">
            tokenomics
          </Link>
          {SOCIAL_LINKS.github && (
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 transition-colors duration-250 hover:text-text"
            >
              github
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-white/50 shadow-soft transition-all duration-250 group-hover:border-accent/40 group-hover:text-accent group-hover:shadow-glow">
                <ArrowUpRight size={11} strokeWidth={2} />
              </span>
            </a>
          )}
          {SOCIAL_LINKS.x && (
            <a
              href={SOCIAL_LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 transition-colors duration-250 hover:text-text"
            >
              x
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/60 bg-white/50 shadow-soft transition-all duration-250 group-hover:border-accent/40 group-hover:text-accent group-hover:shadow-glow">
                <ArrowUpRight size={11} strokeWidth={2} />
              </span>
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
