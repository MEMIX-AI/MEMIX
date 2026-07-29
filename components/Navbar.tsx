"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Wallet, Menu, X } from "lucide-react";
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
        className="gradient-brand flex items-center gap-2 rounded-xl px-[18px] py-[11px] text-sm font-semibold text-white shadow-glow transition-transform duration-200"
        disabled
      >
        <Wallet size={15} strokeWidth={1.75} />
        Connect Wallet
      </button>
    ),
  },
);

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/library", label: "Library" },
  { href: "/creators", label: "Creators" },
  { href: "/upload", label: "Upload" },
];

const CATALOG_LINKS = [
  { href: "/docs", label: "Docs" },
  { href: "/roadmap", label: "Roadmap" },
];

export function Navbar() {
  const pathname = usePathname();
  const [walletRequested, setWalletRequested] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: librarianOpen, setOpen: setLibrarianOpen } = useLibrarianOpen();

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname?.startsWith(href + "/");
  }

  function linkClass(active: boolean) {
    return `rounded-[11px] px-3.5 py-2 font-medium transition-all duration-200 ${
      active
        ? "gradient-brand text-white shadow-glow"
        : "text-dim hover:-translate-y-px hover:bg-accent/[0.08] hover:text-text"
    }`;
  }

  return (
    <div className="sticky top-4 z-30 mx-auto w-full max-w-[1192px] px-4 sm:px-6">
      <header className="glass relative flex h-[72px] items-center gap-1 rounded-[20px] border border-line px-3.5 shadow-[0_8px_30px_rgba(24,184,216,0.10)] sm:px-5">
        <Link href="/" className="flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight">
          <span className="gradient-logo flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-base font-bold text-white shadow-glow">
            m
          </span>
          <span className="gradient-logo-text">memix</span>
        </Link>

        {/* Full menu — only above ~1000px. Below that it wrapped onto a
            second line inside this fixed-height pill and overflowed
            straight into the hero; hidden + a hamburger drawer instead
            of wrapping is the fix, not a squeeze-it-in tweak. */}
        <nav className="ml-3 hidden min-[1000px]:flex min-[1000px]:items-center min-[1000px]:gap-0.5 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href, link.exact))}>
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setLibrarianOpen((v) => !v)}
            className={linkClass(librarianOpen)}
          >
            AI Agent
          </button>
          {CATALOG_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {walletRequested ? (
            <WalletWidget autoShow />
          ) : (
            <button
              onClick={() => setWalletRequested(true)}
              className="gradient-brand flex items-center gap-2 rounded-xl px-[18px] py-[11px] text-sm font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Wallet size={15} strokeWidth={1.75} />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "close menu" : "open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/40 text-text min-[1000px]:hidden"
          >
            {mobileOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="glass absolute left-0 right-0 top-[calc(100%+8px)] flex flex-col gap-1 rounded-[20px] border border-line p-3 shadow-[0_8px_30px_rgba(24,184,216,0.10)] min-[1000px]:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={linkClass(isActive(link.href, link.exact))}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setLibrarianOpen((v) => !v);
                setMobileOpen(false);
              }}
              className={`text-left ${linkClass(librarianOpen)}`}
            >
              AI Agent
            </button>
            {CATALOG_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={linkClass(isActive(link.href))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}
