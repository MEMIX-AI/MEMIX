"use client";

import { WalletButton } from "@/components/WalletButton";

// Single entry point for next/dynamic(..., { ssr: false }) in Navbar.tsx
// — WalletButton itself is what actually needs the wagmi/connectkit
// hooks, so importing it lazily still keeps that bundle out of the main
// chunk. The provider tree it needs (WagmiProvider/ConnectKitProvider/
// SIWEProvider) now lives at the app root (see
// components/providers/AppWalletShell.tsx) instead of being bundled in
// here — it used to be scoped to just this widget, but that meant any
// OTHER component needing wagmi (e.g. components/marketplace/BuyButton)
// ended up in a second, independent provider instance with its own
// unsynced connection state (see AppWalletShell's comment for the exact
// failure that caused: a wallet connected via this button was invisible
// to BuyButton, which then tried to open a brand new WalletConnect
// session instead of using the existing one).
export function WalletWidget({ autoShow }: { autoShow?: boolean }) {
  return <WalletButton autoShow={autoShow} />;
}
