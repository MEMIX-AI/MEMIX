"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, SIWEProvider } from "connectkit";
import { wagmiConfig } from "@/lib/wagmi-config";
import { siweConfig } from "@/lib/siwe-config";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    // reconnectOnMount defaults to true — wagmi silently restores the
    // last-used connector (if the wallet extension still has it granted)
    // instead of forcing a full reconnect+re-sign every time. An earlier
    // version of this set reconnectOnMount=false on purpose, but in real
    // usage that meant every fresh page load — including landing on
    // Docs/Creators/My Profile, or right after finishing an upload —
    // showed "Connect Wallet" again from scratch, even though the real
    // mv_session cookie (server-side, 7 days) was still perfectly valid.
    // See components/Navbar.tsx for the other half of this fix: the
    // wallet bundle now eager-mounts (without popping the modal) for a
    // browser that's signed in before, so this restore actually gets a
    // chance to run without requiring a click first.
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SIWEProvider {...siweConfig} signOutOnNetworkChange={false}>
          <ConnectKitProvider
            // "midnight" (ConnectKit's own dark theme) instead of "soft"
            // — v6 is a dark app now, and letting ConnectKit's dark base
            // theme handle the many internal pieces we don't override
            // below (QR modal, wallet list rows, scan states, etc.) is
            // far more reliable than hand-guessing every one of their
            // hex values ourselves the way the old light "soft" theme's
            // override block did.
            theme="midnight"
            customTheme={{
              "--ck-font-family":
                "var(--font-body), ui-sans-serif, system-ui, sans-serif",
              "--ck-border-radius": "20px",
              "--ck-accent-color": "#4fd8ff",
              // Dark text on our bright cyan accent button — matches
              // every other gradient-brand button's text color app-wide.
              "--ck-accent-text-color": "#04120e",
              "--ck-focus-color": "#4fd8ff",
              "--ck-primary-button-border-radius": "9999px",
            }}
          >
            {children}
          </ConnectKitProvider>
        </SIWEProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
