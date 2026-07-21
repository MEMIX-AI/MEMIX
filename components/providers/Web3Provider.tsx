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
            theme="midnight"
            customTheme={{
              "--ck-font-family":
                "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              "--ck-border-radius": "6px",
              "--ck-accent-color": "#ffd23f",
              "--ck-accent-text-color": "#0b0d10",
              "--ck-body-background": "#11141a",
              "--ck-body-background-secondary": "#0b0d10",
              "--ck-body-color": "#e8e6e0",
              "--ck-body-color-muted": "#8a919e",
              "--ck-body-divider": "#232833",
              "--ck-focus-color": "#ffd23f",
            }}
          >
            {children}
          </ConnectKitProvider>
        </SIWEProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
