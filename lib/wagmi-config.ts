import { createConfig } from "wagmi";
import { defineChain } from "viem";
import { base, mainnet, polygon, optimism, arbitrum, bsc, avalanche } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

// Real chain the $MIX marketplace actually transacts on — needed here,
// not just server-side in lib/marketplace.ts's ROBINHOOD_RPC_URL, because
// components/marketplace/BuyButton.tsx's useWriteContract/usePublicClient
// need wagmi to know how to reach it too. Without this, wagmi has no
// client for chain id 4663 at all, and a write attempt has nothing to
// target — the actual cause of the "Buy" button crashing outright rather
// than showing a clean error. RPC URL/chain id verified live against
// Robinhood's own docs (docs.robinhood.com/chain/connecting) and a real
// eth_chainId call, not guessed.
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

// Wallet connect ITSELF is for IDENTITY only (SIWE sign-in) — no
// payments, no contract calls — so sign-in doesn't need to happen on any
// particular chain, which is why mainnet/base/polygon/etc are still
// listed even though none of them are where $MIX lives. Previously
// restricted to Base only, which meant anyone whose wallet defaulted to
// a different network got stuck behind a "switch to base" step before
// they could even sign in — recognizing whichever common chain the
// wallet is already on removes that friction entirely.
// robinhoodChain is listed too, and it's the one BuyButton actually
// targets by chainId when sending a real $MIX transfer.
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "memix",
    appDescription: "the librarian for the internet's meme library",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    chains: [mainnet, base, polygon, optimism, arbitrum, bsc, avalanche, robinhoodChain],
  }),
);
