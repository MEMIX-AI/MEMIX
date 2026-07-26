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
        <SIWEProvider {...siweConfig}>
          <ConnectKitProvider
            theme="soft"
            customTheme={{
              "--ck-font-family":
                "var(--font-body), ui-sans-serif, system-ui, sans-serif",
              "--ck-border-radius": "20px",
              "--ck-accent-color": "#12c7d6",
              "--ck-accent-text-color": "#ffffff",
              "--ck-body-background": "#fbfffe",
              "--ck-body-background-secondary": "#ddfcf6",
              "--ck-body-color": "#12283a",
              "--ck-body-color-muted": "#4b6478",
              "--ck-body-divider": "rgba(60, 100, 180, 0.14)",
              "--ck-focus-color": "#12c7d6",
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
