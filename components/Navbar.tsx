"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { ConnectKitButton, useSIWE } from "connectkit";
import { ChevronDown, Wallet, ShieldCheck, User, KeyRound, LogOut, ArrowLeftRight } from "lucide-react";
import { useAccountRole } from "@/lib/hooks/useAccountRole";

const NAV_LINKS = [
  { href: "/library", label: "library" },
  { href: "/upload", label: "upload" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { switchChain, isPending: switchingChain } = useSwitchChain();
  const { isSignedIn, signIn, signOut, isLoading } = useSIWE();
  // Only Base is a configured chain (lib/wagmi-config.ts) — if a wallet is
  // connected but sitting on a different network (very common: most
  // MetaMask installs default to Ethereum Mainnet), wagmi can't resolve a
  // `chain`, and ConnectKit's own signIn() throws "No chainId found" the
  // moment sign-in is attempted. That surfaces to a real person as "I
  // click connect/sign-in and nothing happens" — so this has to be caught
  // and handled with its own explicit step, not left for the SIWE call to
  // fail on.
  const wrongChain = isConnected && chain?.id !== base.id;
  const { isAdmin } = useAccountRole(isSignedIn ? address : undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="glass sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line/80 px-4 py-3.5 shadow-soft sm:px-6">
      <Link href="/" className="flex items-center gap-1 font-heading text-lg font-bold">
        <span className="gradient-text">memevault</span>
        <span className="cursor-blink text-accent">▊</span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 font-medium transition-all duration-200 ${
                active
                  ? "gradient-brand text-white shadow-glow"
                  : "text-dim hover:bg-panel hover:text-text hover:shadow-soft"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <span className="cursor-default rounded-full px-4 py-2 font-medium text-dim/60">
          agent
        </span>
        <span className="cursor-default rounded-full px-4 py-2 font-medium text-dim/60">
          docs
        </span>

        <ConnectKitButton.Custom>
          {({ show }) => {
            if (!isConnected) {
              return (
                <button
                  onClick={show}
                  className="gradient-brand ml-1 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
                >
                  <Wallet size={15} strokeWidth={2.25} />
                  connect
                </button>
              );
            }

            if (wrongChain) {
              return (
                <button
                  onClick={() => switchChain({ chainId: base.id })}
                  className="ml-1 flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn shadow-soft transition-all duration-200 hover:bg-warn/15 disabled:opacity-60"
                  disabled={switchingChain}
                >
                  <ArrowLeftRight size={15} strokeWidth={2.25} />
                  {switchingChain ? "switching…" : "switch to base"}
                </button>
              );
            }

            if (!isSignedIn) {
              return (
                <button
                  onClick={() => signIn()}
                  className="ml-1 flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-text shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg disabled:opacity-60"
                  disabled={isLoading}
                >
                  <Wallet size={15} strokeWidth={2.25} />
                  {isLoading ? "signing…" : "sign in"}
                </button>
              );
            }

            const truncated = address
              ? `${address.slice(0, 6)}…${address.slice(-4)}`
              : "";

            return (
              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-text shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-white">
                    <User size={13} strokeWidth={2.5} />
                  </span>
                  {truncated}
                  {isAdmin && (
                    <span className="gradient-brand flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      <ShieldCheck size={11} strokeWidth={2.5} />
                      admin
                    </span>
                  )}
                  <ChevronDown size={14} className={`text-dim transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-panel text-sm shadow-soft-lg">
                    <Link
                      href="/my-uploads"
                      className="flex items-center gap-2 px-4 py-2.5 text-text transition-colors hover:bg-bg"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User size={14} className="text-dim" />
                      my uploads
                    </Link>
                    <Link
                      href="/my-uploads/api-key"
                      className="flex items-center gap-2 px-4 py-2.5 text-text transition-colors hover:bg-bg"
                      onClick={() => setMenuOpen(false)}
                    >
                      <KeyRound size={14} className="text-dim" />
                      api key
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-text transition-colors hover:bg-bg"
                        onClick={() => setMenuOpen(false)}
                      >
                        <ShieldCheck size={14} className="text-dim" />
                        admin panel
                      </Link>
                    )}
                    <button
                      className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-dim transition-colors hover:bg-bg hover:text-text"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut size={14} />
                      disconnect
                    </button>
                  </div>
                )}
              </div>
            );
          }}
        </ConnectKitButton.Custom>
      </nav>
    </header>
  );
}
