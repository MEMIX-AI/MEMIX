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
    // reconnectOnMount=false: owner explicitly wants the wallet picker
    // every time, not a silent auto-reconnect to whatever wallet was used
    // last visit. This only affects wagmi's client-side connection state
    // — the actual mv_session cookie (server-side, checked independently
    // via getCurrentUser()) is untouched, so an already-signed-in user
    // isn't logged out, they just have to reconnect+re-pick their wallet
    // before the UI shows them as connected again.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
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
