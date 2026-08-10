// Pure constants, zero dependencies — safe to import from both server
// code (lib/mix-token.ts, lib/marketplace.ts) and client components
// (components/marketplace/BuyButton.tsx, which calls wagmi's
// useWriteContract directly from the browser). lib/mix-token.ts imports
// prisma at module scope, which breaks if pulled into a client bundle —
// this file exists specifically so the buy flow's UI never has to import
// that.

// Fixed by the brief — the real $MIX contract on Robinhood Chain, not
// something that should ever come from a request or env var (unlike the
// RPC endpoint, which genuinely varies by provider/deployment).
export const MIX_TOKEN_ADDRESS = "0xB9e6319feAb4284BBcB1cD361387F550cbDe16a5";

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;
