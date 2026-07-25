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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SIWEProvider {...siweConfig}>
          <ConnectKitProvider
            theme="soft"
            customTheme={{
              "--ck-font-family":
                "var(--font-body), ui-sans-serif, system-ui, sans-serif",
              "--ck-border-radius": "20px",
              "--ck-accent-color": "#1ca6b8",
              "--ck-accent-text-color": "#ffffff",
              "--ck-body-background": "#f2fffd",
              "--ck-body-background-secondary": "#dff6f3",
              "--ck-body-color": "#12333a",
              "--ck-body-color-muted": "#4b6a72",
              "--ck-body-divider": "rgba(40, 120, 130, 0.15)",
              "--ck-focus-color": "#1ca6b8",
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
