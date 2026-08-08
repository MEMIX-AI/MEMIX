"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectKitButton, useModal, useSIWE } from "connectkit";
import { ChevronDown, Wallet, ShieldCheck, User, KeyRound, LogOut, UserCircle, Repeat } from "lucide-react";
import { useAccountRole } from "@/lib/hooks/useAccountRole";
import { useProfile } from "@/lib/hooks/useProfile";
import { WALLET_RETURNING_KEY } from "@/lib/wallet-returning";

// The actual wagmi/connectkit-dependent connect/sign-in/account-menu
// button. Split out of Navbar so the wagmi/viem/connectkit bundle (large
// — connectors, WalletConnect, etc.) can be code-split and lazily loaded
// on the client only (see components/providers/WalletWidget.tsx), instead
// of shipping in the main app bundle every single visitor downloads even
// if they never touch a wallet.
//
// `autoShow`: Navbar mounts this component either after an explicit
// click on the static placeholder button (that click is "lost" — it
// landed on the placeholder, not the real ConnectKitButton) or silently
// for a returning signed-in browser (see Navbar.tsx) — only the click
// case passes autoShow=true, to replay opening the modal once the real
// button is ready. See the retry loop below for why this isn't a single
// setOpen(true) call on mount.
export function WalletButton({ autoShow }: { autoShow?: boolean }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isSignedIn, signIn, signOut, isLoading } = useSIWE();
  const { isAdmin } = useAccountRole(isSignedIn ? address : undefined);
  const { username, avatarUrl } = useProfile(isSignedIn ? address : undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { open, setOpen } = useModal();
  // Read inside the retry interval below via a ref, not the `open`
  // value closed over at mount — that interval is created once (empty
  // dep array) and would otherwise only ever see whatever `open` was on
  // the very first render, never the updated value once the modal
  // actually opens.
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // setOpen(true) called on the very first render tick here reliably did
  // nothing — verified live: ConnectKitProvider hasn't finished its own
  // internal mount (the modal portal isn't ready to respond yet), so the
  // call was a silent no-op and the button just sat there looking
  // unclicked. That's the actual "takes two clicks" bug: the *second*
  // click worked because by then the button had swapped to the real,
  // fully-mounted ConnectKitButton whose own `show` handler doesn't have
  // this race. Retrying setOpen(true) for a bit and bailing out the
  // moment `open` actually flips true (checked against ConnectKit's own
  // state, not a guessed delay) reproduces that same "wait until it's
  // actually ready" outcome. Shared by the autoShow-on-mount effect below
  // AND switchWallet() — reopening the picker right after disconnect()
  // hits the same "portal/internal state not caught up yet" race.
  function openModalWhenReady() {
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (openRef.current || attempts > 20) {
        clearInterval(id);
        return;
      }
      setOpen(true);
    }, 50);
    return () => clearInterval(id);
  }

  useEffect(() => {
    if (!autoShow || isConnected) return;
    return openModalWhenReady();
    // Only ever replay the click that triggered loading this component in
    // the first place — deliberately not reactive to isConnected/setOpen
    // changing afterward, this is a one-shot "continue what the user
    // already asked for" on mount, not an ongoing sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marks this browser as "has signed in before" so Navbar knows to
  // eager-mount this whole component next visit (silently, no modal, no
  // auto-connect — see Navbar.tsx) so the wallet JS chunk is already
  // downloaded by the time a returning visitor clicks Connect Wallet.
  useEffect(() => {
    if (isSignedIn) localStorage.setItem(WALLET_RETURNING_KEY, "1");
  }, [isSignedIn]);

  // The full, real end-of-session: clears our own server-side mv_session
  // (signOut, from siweConfig — just an API call, does not touch the
  // wallet connection at all) AND wagmi's own connector state
  // (disconnect) AND the "has signed in before" flag. All three, always
  // together — signOut() alone previously left wagmi still connected to
  // the same wallet behind the scenes, which is exactly why there was no
  // real way to switch wallets before: the account menu's old
  // "disconnect" button dropped back to the plain "sign in" state (still
  // the same wallet), never back to "Connect Wallet" with a fresh
  // picker.
  function endSession() {
    localStorage.removeItem(WALLET_RETURNING_KEY);
    signOut();
    disconnect();
  }

  // "switch wallet" — end the current session, then reopen the picker
  // immediately instead of dropping back to the idle button and making
  // the user click Connect Wallet a second time.
  function switchWallet() {
    endSession();
    openModalWhenReady();
  }

  return (
    <ConnectKitButton.Custom>
      {({ show }) => {
        if (!isConnected) {
          return (
            <button
              onClick={show}
              className="gradient-brand flex items-center gap-2 rounded-xl px-[18px] py-[11px] text-sm font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
            >
              <Wallet size={15} strokeWidth={1.75} />
              Connect Wallet
            </button>
          );
        }

        if (!isSignedIn) {
          return (
            <div className="ml-1 flex items-center gap-1.5">
              <button
                onClick={() => signIn()}
                className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-text shadow-soft transition-all duration-250 hover:border-accent/40 hover:shadow-soft-lg disabled:opacity-60"
                disabled={isLoading}
              >
                <Wallet size={15} strokeWidth={1.75} />
                {isLoading ? "signing…" : "sign in"}
              </button>
              {/* Escape hatch for "wrong wallet connected" without a full
                  disconnect-then-reconnect round trip — connected but not
                  yet signed in is exactly the moment someone notices the
                  picker grabbed the wrong account. */}
              <button
                onClick={switchWallet}
                aria-label="switch wallet"
                title="switch wallet"
                disabled={isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-dim transition-all duration-250 hover:border-accent/40 hover:text-text disabled:opacity-60"
              >
                <Repeat size={14} strokeWidth={1.75} />
              </button>
            </div>
          );
        }

        const truncated = address
          ? `${address.slice(0, 6)}…${address.slice(-4)}`
          : "";
        // Display name falls back to the shortened address — same rule
        // as the profile page itself (lib/profile.ts has no "display
        // name" concept of its own; every renderer decides this the same
        // way independently rather than persisting a computed fallback).
        const displayName = username || truncated;

        return (
          <div className="relative ml-1" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-text shadow-soft transition-all duration-250 hover:border-accent/40 hover:shadow-soft-lg"
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full gradient-brand text-white">
                {avatarUrl ? (
                  // Arbitrary URL — can be a pasted external link, not
                  // just our own Supabase storage — so next/image's
                  // remotePatterns allowlist doesn't apply here the way
                  // it does for asset thumbnails.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={13} strokeWidth={2} />
                )}
              </span>
              {displayName}
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
                  href={address ? `/u/${address}` : "#"}
                  className="flex items-center gap-2 px-4 py-2.5 text-text transition-colors hover:bg-bg"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserCircle size={14} className="text-dim" />
                  my profile
                </Link>
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
                    switchWallet();
                  }}
                >
                  <Repeat size={14} />
                  switch wallet
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-dim transition-colors hover:bg-bg hover:text-text"
                  onClick={() => {
                    setMenuOpen(false);
                    endSession();
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
