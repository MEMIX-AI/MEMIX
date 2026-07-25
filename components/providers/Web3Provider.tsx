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
              "--ck-accent-color": "#6d5df6",
              "--ck-accent-text-color": "#ffffff",
              "--ck-body-background": "#ffffff",
              "--ck-body-background-secondary": "#f8fafc",
              "--ck-body-color": "#111827",
              "--ck-body-color-muted": "#6b7280",
              "--ck-body-divider": "#e5e7eb",
              "--ck-focus-color": "#6d5df6",
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
