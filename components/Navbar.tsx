"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Wallet, Sparkles } from "lucide-react";
import { useLibrarianOpen } from "./librarian/LibrarianOpenContext";

// wagmi/viem/connectkit (~1.2MB uncompressed) only exist for this one
// button — code-split so that JS is never even requested until someone
// actually goes to connect a wallet, per the "wallet must init lazily"
// requirement. The static placeholder below is pixel-identical to
// WalletButton's real disconnected state, so there's no visible
// difference before vs. after the click — clicking it just starts the
// dynamic import and flips to the real, wagmi-backed button, which
// replays the click (see WalletButton's `autoShow`) so the connect modal
// still opens on the very first click, not the second.
const WalletWidget = dynamic(
  () => import("./providers/WalletWidget").then((m) => m.WalletWidget),
  {
    ssr: false,
    loading: () => (
      <button
        className="gradient-brand ml-1 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-250"
        disabled
      >
        <Wallet size={15} strokeWidth={1.75} />
        connect
      </button>
    ),
  },
);

const NAV_LINKS = [
  { href: "/library", label: "library" },
  { href: "/upload", label: "upload" },
];

const CATALOG_LINKS = [
  { href: "/docs", label: "docs" },
  { href: "/roadmap", label: "roadmap" },
];

export function Navbar() {
  const pathname = usePathname();
  const [walletRequested, setWalletRequested] = useState(false);
  const { open: librarianOpen, setOpen: setLibrarianOpen } = useLibrarianOpen();

  return (
    <header className="glass sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-b-[22px] border-b border-white/40 px-4 py-3.5 shadow-soft sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
        <span className="gradient-logo flex h-7 w-7 items-center justify-center rounded-full text-white shadow-soft">
          <Sparkles size={14} strokeWidth={2} />
        </span>
        <span className="gradient-logo-text">memix</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 font-medium transition-all duration-250 ${
                active
                  ? "gradient-brand text-white shadow-glow"
                  : "text-dim hover:bg-panel hover:text-text hover:shadow-soft"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          onClick={() => setLibrarianOpen((v) => !v)}
          className={`rounded-full px-4 py-2 font-medium transition-all duration-250 ${
            librarianOpen
              ? "gradient-brand text-white shadow-glow"
              : "text-dim hover:bg-panel hover:text-text hover:shadow-soft"
          }`}
        >
          agent
        </button>
        {CATALOG_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 font-medium transition-all duration-250 ${
                active
                  ? "gradient-brand text-white shadow-glow"
                  : "text-dim hover:bg-panel hover:text-text hover:shadow-soft"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        {walletRequested ? (
          <WalletWidget autoShow />
        ) : (
          <button
            onClick={() => setWalletRequested(true)}
            className="gradient-brand ml-1 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
          >
            <Wallet size={15} strokeWidth={1.75} />
            connect
          </button>
        )}
      </nav>
    </header>
  );
}
