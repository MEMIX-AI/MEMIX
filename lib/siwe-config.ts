import type { SIWEConfig } from "connectkit";
import { buildSiweMessage } from "./siwe-message";

// Wires ConnectKit's built-in SIWE flow to our own API routes. ConnectKit
// calls these in order (getNonce -> createMessage -> wallet signs ->
// verifyMessage) and treats the wallet as "connected" only once
// verifyMessage succeeds — see components/providers/Web3Provider.tsx.
export const siweConfig: SIWEConfig = {
  getNonce: async () => {
    const res = await fetch("/api/auth/nonce");
    if (!res.ok) throw new Error("failed to fetch nonce");
    const { nonce } = await res.json();
    return nonce;
  },

  createMessage: ({ nonce, address, chainId }) =>
    buildSiweMessage({ address, nonce, chainId }),

  verifyMessage: async ({ message, signature }) => {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    return res.ok;
  },

  getSession: async () => {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.walletAddress) return null;
    // Our own session (mv_session) is chain-agnostic — it only ever
    // encodes the wallet address, never a chain. ConnectKit's SIWESession
    // type requires a chainId field regardless, but Web3Provider disables
    // `signOutOnNetworkChange` (the only thing that reads it), so this
    // value is never actually compared against anything. 0 makes that
    // explicit rather than implying a specific chain was recorded.
    return { address: data.walletAddress, chainId: 0 };
  },

  signOut: async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.ok;
  },
};
