"use client";

import { Web3Provider } from "./Web3Provider";
import { WalletButton } from "@/components/WalletButton";

// Single entry point for next/dynamic(..., { ssr: false }) in Navbar.tsx
// — bundles the wagmi/viem/connectkit provider tree together with the
// button that actually needs it, so that whole stack loads as one
// separate, lazily-fetched chunk instead of shipping in the main bundle
// every page load pays for.
export function WalletWidget({ autoShow }: { autoShow?: boolean }) {
  return (
    <Web3Provider>
      <WalletButton autoShow={autoShow} />
    </Web3Provider>
  );
}
