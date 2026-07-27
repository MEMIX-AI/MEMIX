import { createConfig } from "wagmi";
import { base, mainnet, polygon, optimism, arbitrum, bsc, avalanche } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

// Wallet connect is for IDENTITY only (SIWE sign-in) — no payments, no
// contract calls — so sign-in doesn't actually need to happen on any
// particular chain. Previously restricted to Base only, which meant
// anyone whose wallet defaulted to a different network (the common
// case) got stuck behind a "switch to base" step before they could even
// sign in — recognizing whichever common chain the wallet is already on
// removes that friction entirely. Base stays in the list since it's
// still the target ecosystem for future (not-yet-built) paid features.
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "memix",
    appDescription: "the librarian for the internet's meme library",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    chains: [mainnet, base, polygon, optimism, arbitrum, bsc, avalanche],
  }),
);
