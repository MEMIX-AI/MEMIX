"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { ConnectKitButton, useModal, useSIWE } from "connectkit";
import { ChevronDown, Wallet, ShieldCheck, User, KeyRound, LogOut, ArrowLeftRight } from "lucide-react";
import { useAccountRole } from "@/lib/hooks/useAccountRole";

// The actual wagmi/connectkit-dependent connect/sign-in/account-menu
// button. Split out of Navbar so the wagmi/viem/connectkit bundle (large
// — connectors, WalletConnect, etc.) can be code-split and lazily loaded
// on the client only (see components/providers/WalletWidget.tsx), instead
// of shipping in the main app bundle every single visitor downloads even
// if they never touch a wallet.
//
// `autoShow`: Navbar only mounts this component (triggering the dynamic
// import) after the user's first click on the static placeholder button —
// that click is "lost" (it landed on the placeholder, not the real
// ConnectKitButton), so this replays it once the real button is ready by
// calling `show()` itself on mount. Only fires when nothing else has
// already changed the connect state in the meantime.
export function WalletButton({ autoShow }: { autoShow?: boolean }) {
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
  const { setOpen } = useModal();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (autoShow && !isConnected) setOpen(true);
    // Only ever replay the click that triggered loading this component in
    // the first place — deliberately not reactive to isConnected/setOpen
    // changing afterward, this is a one-shot "continue what the user
    // already asked for" on mount, not an ongoing sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ConnectKitButton.Custom>
      {({ show }) => {
        if (!isConnected) {
          return (
            <button
              onClick={show}
              className="gradient-brand ml-1 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
            >
              <Wallet size={15} strokeWidth={1.75} />
              connect
            </button>
          );
        }

        if (wrongChain) {
          return (
            <button
              onClick={() => switchChain({ chainId: base.id })}
              className="ml-1 flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm font-semibold text-warn shadow-soft transition-all duration-250 hover:bg-warn/15 disabled:opacity-60"
              disabled={switchingChain}
            >
              <ArrowLeftRight size={15} strokeWidth={1.75} />
              {switchingChain ? "switching…" : "switch to base"}
            </button>
          );
        }

        if (!isSignedIn) {
          return (
            <button
              onClick={() => signIn()}
              className="ml-1 flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-text shadow-soft transition-all duration-250 hover:border-accent/40 hover:shadow-soft-lg disabled:opacity-60"
              disabled={isLoading}
            >
              <Wallet size={15} strokeWidth={1.75} />
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
              className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-text shadow-soft transition-all duration-250 hover:border-accent/40 hover:shadow-soft-lg"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-white">
                <User size={13} strokeWidth={2} />
              </span>
              {truncated}
              {isAdmin && (
                <span className="gradient-brand flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <ShieldCheck size={11} strokeWidth={2} />
                  admin
                </span>
              )}
              <ChevronDown size={14} className={`text-dim transition-transform duration-250 ${menuOpen ? "rotate-180" : ""}`} />
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
  );
}
