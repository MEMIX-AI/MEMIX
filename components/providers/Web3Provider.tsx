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
    // reconnectOnMount explicitly false — wagmi must NEVER silently
    // restore a previous wallet connection without the user clicking
    // through the picker first. An earlier version of this relied on the
    // default (true) specifically so a returning visitor didn't see
    // "Connect Wallet" again on every fresh page load — but the real-world
    // cost of that turned out to be worse: clicking "Connect Wallet"
    // could silently reuse the cached MetaMask connection and jump
    // straight into a signature prompt, with the wallet-picker modal
    // never shown at all (reported live: "connects directly to MetaMask
    // without giving a choice"). Consent to which wallet to use every
    // time now wins over that convenience.
    //
    // This does NOT mean returning visitors re-sign every page load: the
    // real mv_session cookie (server-side, 7 days) is still what
    // getSession() in lib/siwe-config.ts checks, so once a visitor picks
    // their wallet again (an explicit click, silent/instant if the
    // extension already has this site authorized — no extra signature),
    // ConnectKit sees the still-valid session and skips straight past
    // the sign step. The eager wallet-bundle preload in Navbar.tsx for
    // returning visitors is kept — it's a pure JS-download optimization
    // (so the picker opens instantly on click, no chunk-loading flicker),
    // it does not auto-connect or auto-show anything on its own.
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
