"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Web3Provider = dynamic(() => import("./Web3Provider").then((m) => m.Web3Provider), {
  ssr: false,
});

// The ONE real WagmiProvider/ConnectKitProvider/SIWEProvider for the
// whole app — wraps Navbar + page content + Footer together so a wallet
// connected via the Navbar is the SAME live connection any page's
// BuyButton sees, not a second, independent one.
//
// Why this exists instead of just putting <Web3Provider> in
// app/layout.tsx directly: Web3Provider is deliberately ssr:false (wagmi/
// viem/connectkit is a large bundle nobody should pay for on first load),
// and a component rendered via next/dynamic(ssr:false) renders NOTHING
// server-side — including whatever children are passed into it. Wrapping
// the whole app in that directly would mean Navbar/page content/Footer
// never get server-rendered at all: a blank page until JS finishes
// loading, on every single route. That's the mistake an earlier version
// of this fix made by giving BuyButton its own SEPARATE local
// WagmiProvider (components/marketplace/BuyButtonProvider.tsx, since
// removed) — code-splitting duplicated the config module across two
// different dynamic-import chunks, producing two independent
// createConfig() stores that didn't share connection state at all (a
// wallet connected via the Navbar's instance was invisible to BuyButton's
// instance), which is what caused Buy to silently attempt a brand new
// WalletConnect session ("Proposal expired") instead of using the
// already-connected wallet.
//
// This component sidesteps both problems: children render immediately,
// identically, on the server AND on the client's first paint (mounted
// starts false in both places, so first render is just `children`
// unwrapped — no hydration mismatch). Only after mount does the effect
// below flip `mounted` to true, at which point Web3Provider — one single
// instance — mounts around the already-rendered, already-hydrated
// children. Context providers don't add DOM of their own, so this
// doesn't remount or visually disturb anything already on screen.
export function AppWalletShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  return <Web3Provider>{children}</Web3Provider>;
}
