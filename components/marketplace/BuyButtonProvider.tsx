"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi-config";
import { BuyButton, type BuyButtonProps } from "./BuyButton";

// BuyButton's useAccount/useWriteContract/usePublicClient need a real
// WagmiProvider ancestor — and the app's ONE WagmiProvider instance
// (components/providers/Web3Provider.tsx) is deliberately scoped only
// inside the Navbar's wallet button (see WalletWidget.tsx), not the page
// body, specifically so wagmi/viem/connectkit never ships on pages that
// don't need a wallet. That's exactly why "Buy" crashed outright
// (WagmiProviderNotFoundError) the first time this got tested against a
// real listing: BuyButton was rendered entirely outside that tree.
//
// Fix is a second, LOCAL WagmiProvider — not lifting the real one to the
// root (that would force wagmi/viem into every single page's initial
// bundle and break this app's whole "lazy-load the wallet stack"
// design). Deliberately lean: just WagmiProvider + QueryClientProvider,
// no ConnectKitProvider/SIWEProvider (BuyButton never opens the wallet
// picker or signs in — it tells the buyer to use the Navbar's button for
// that, see the "connect your wallet (top right)" copy in BuyButton.tsx).
//
// Both this provider and the Navbar's point at the exact same wagmiConfig
// singleton object (lib/wagmi-config.ts) — wagmi's actual connection
// state lives inside that config object itself (a vanilla store), not
// inside whichever <WagmiProvider> happens to render it, so a wallet
// connected via the Navbar shows up as connected here too, with no
// separate connect step and no duplicated connection state.
export function BuyButtonProvider(props: BuyButtonProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <BuyButton {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
