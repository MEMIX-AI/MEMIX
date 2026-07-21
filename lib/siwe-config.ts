import type { SIWEConfig } from "connectkit";
import { base } from "wagmi/chains";
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
    return { address: data.walletAddress, chainId: base.id };
  },

  signOut: async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.ok;
  },
};
