import { createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

// Wallet connect is for IDENTITY only in this phase — no payments, no
// contract calls — so a single chain (Base, the target ecosystem per
// CLAUDE.md) with default public RPC transports is enough.
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "memix",
    appDescription: "the librarian for the internet's meme library",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    chains: [base],
  }),
);
