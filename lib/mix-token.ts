import { createPublicClient, http, getAddress, formatUnits } from "viem";
import { prisma } from "./prisma";

// Fixed by the brief — the real $MIX contract on Robinhood Chain, not
// something that should ever come from a request or env var (unlike the
// RPC endpoint, which genuinely varies by provider/deployment).
const MIX_TOKEN_ADDRESS = "0xB9e6319feAb4284BBcB1cD361387F550cbDe16a5";

const ERC20_ABI = [
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
] as const;

function cacheTtlMs(): number {
  const seconds = Number(process.env.MIX_BALANCE_CACHE_TTL_SECONDS);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
}

// No `chain` passed to createPublicClient — this only ever does a plain
// eth_call (balanceOf/decimals), which needs nothing chain-specific
// beyond a reachable RPC endpoint. Robinhood Chain's exact chain id isn't
// something this codebase has needed anywhere else, and guessing one
// wrong would be worse than just not asserting it for a read-only call.
async function readBalanceOnChain(walletAddress: string): Promise<number> {
  const rpcUrl = process.env.ROBINHOOD_RPC_URL;
  if (!rpcUrl) {
    throw new Error("ROBINHOOD_RPC_URL is not set");
  }

  const client = createPublicClient({ transport: http(rpcUrl) });
  const account = getAddress(walletAddress);
  const token = getAddress(MIX_TOKEN_ADDRESS);

  const [raw, decimals] = await Promise.all([
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    }),
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ]);

  // Real on-chain decimals, never assumed to be 18 — some tokens aren't.
  return Number(formatUnits(raw, decimals));
}

// Returns the wallet's real, human-readable $MIX balance, or `null` if it
// genuinely couldn't be read (missing RPC config, bad address, the RPC
// call itself failing) — callers MUST treat null as "assume the lowest
// tier," never as "assume holder." See lib/librarian-access.ts.
//
// Cached per wallet for MIX_BALANCE_CACHE_TTL_SECONDS (default 5 min) so
// a wallet browsing around doesn't trigger a fresh RPC call on every
// single request — this is a plain TTL cache, not a stale-data fallback:
// once the TTL expires, a failed re-read returns null same as if there
// were no cache at all, it doesn't fall back to the old value.
export async function getMixBalance(walletAddress: string): Promise<number | null> {
  const wallet = walletAddress.toLowerCase();
  const ttl = cacheTtlMs();

  const cached = await prisma.mixBalanceCache.findUnique({ where: { walletAddress: wallet } });
  if (cached && Date.now() - cached.checkedAt.getTime() < ttl) {
    return cached.balance;
  }

  try {
    const balance = await readBalanceOnChain(wallet);
    await prisma.mixBalanceCache.upsert({
      where: { walletAddress: wallet },
      create: { walletAddress: wallet, balance },
      update: { balance, checkedAt: new Date() },
    });
    return balance;
  } catch (err) {
    console.error(`getMixBalance(${wallet}) failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}
