import { createPublicClient, createWalletClient, http, getAddress, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hash } from "viem";
import { prisma } from "./prisma";
import { MIX_TOKEN_ADDRESS, ERC20_ABI } from "./erc20";
import { getMixDecimals } from "./marketplace";

// The treasury's own signing key — server-only secret, never something
// this codebase generates or stores itself (see .env.example: the owner
// generates this wallet and sets the key directly in Vercel). Missing/
// malformed key is treated as "withdrawals are off" everywhere below,
// the same fail-loud-not-silently pattern lib/marketplace.ts uses for a
// missing PLATFORM_TREASURY_WALLET.
function getTreasuryAccount() {
  const raw = process.env.TREASURY_PRIVATE_KEY;
  if (!raw) return null;
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hash;
  try {
    return privateKeyToAccount(key);
  } catch {
    return null;
  }
}

function getPublicClient() {
  const rpcUrl = process.env.ROBINHOOD_RPC_URL;
  if (!rpcUrl) throw new Error("ROBINHOOD_RPC_URL is not set");
  return createPublicClient({ transport: http(rpcUrl) });
}

export interface CreatorBalance {
  totalEarnedMix: number;
  totalWithdrawnMix: number;
  availableMix: number;
}

// "Available" always nets out CONFIRMED *and* PENDING withdrawals — a
// withdrawal reserved a moment ago (send still in flight) must already
// be excluded here, or a second call could compute the same balance and
// double-spend the treasury. See executeWithdrawal.
export async function getCreatorBalance(creatorWallet: string): Promise<CreatorBalance> {
  const wallet = creatorWallet.toLowerCase();
  const [earnedAgg, settledAgg] = await Promise.all([
    prisma.marketplacePurchase.aggregate({
      where: { sellerWallet: wallet, status: "CONFIRMED" },
      _sum: { sellerAmountMix: true },
    }),
    prisma.withdrawal.aggregate({
      where: { creatorWallet: wallet, status: { in: ["CONFIRMED", "PENDING"] } },
      _sum: { amountMix: true },
    }),
  ]);
  const totalEarnedMix = earnedAgg._sum.sellerAmountMix ?? 0;
  const totalWithdrawnMix = settledAgg._sum.amountMix ?? 0;
  return {
    totalEarnedMix,
    totalWithdrawnMix,
    availableMix: Math.max(0, totalEarnedMix - totalWithdrawnMix),
  };
}

export type WithdrawResult =
  | { ok: true; amountMix: number; txHash: Hash }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "nothing_to_withdraw" }
  | { ok: false; reason: "send_failed"; detail: string }
  | { ok: false; reason: "rpc_unavailable"; detail: string };

// Reserve-then-send: the available amount is locked in by creating a
// PENDING Withdrawal row inside a short DB transaction (no chain calls
// inside it — reserving must stay fast), *then* the on-chain send
// happens outside that transaction, and the same row is finalized to
// CONFIRMED (+ txHash) or FAILED afterward. A crash between reserving
// and finalizing leaves a stuck PENDING row (rare — this process either
// completes or the whole request dies) — recoverable by an admin
// inspecting the Withdrawal table directly, same "admin has power"
// pattern as TakedownLog; not auto-retried, since a stuck row silently
// retrying a real fund transfer is worse than a human checking first.
export async function executeWithdrawal(creatorWallet: string): Promise<WithdrawResult> {
  const wallet = creatorWallet.toLowerCase();
  const account = getTreasuryAccount();
  if (!account) return { ok: false, reason: "not_configured" };

  let decimals: number;
  try {
    decimals = await getMixDecimals();
  } catch (err) {
    return { ok: false, reason: "rpc_unavailable", detail: err instanceof Error ? err.message : String(err) };
  }

  const reserved = await prisma.$transaction(async (tx) => {
    const [earnedAgg, settledAgg] = await Promise.all([
      tx.marketplacePurchase.aggregate({
        where: { sellerWallet: wallet, status: "CONFIRMED" },
        _sum: { sellerAmountMix: true },
      }),
      tx.withdrawal.aggregate({
        where: { creatorWallet: wallet, status: { in: ["CONFIRMED", "PENDING"] } },
        _sum: { amountMix: true },
      }),
    ]);
    const available = Math.max(0, (earnedAgg._sum.sellerAmountMix ?? 0) - (settledAgg._sum.amountMix ?? 0));
    if (available <= 0) return null;
    return tx.withdrawal.create({ data: { creatorWallet: wallet, amountMix: available, status: "PENDING" } });
  });

  if (!reserved) return { ok: false, reason: "nothing_to_withdraw" };

  const rawAmount = parseUnits(reserved.amountMix.toFixed(decimals), decimals);
  const publicClient = getPublicClient();
  const walletClient = createWalletClient({ account, transport: http(process.env.ROBINHOOD_RPC_URL!) });

  try {
    const txHash = await walletClient.writeContract({
      address: getAddress(MIX_TOKEN_ADDRESS),
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [getAddress(wallet), rawAmount],
      chain: undefined,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      await prisma.withdrawal.update({
        where: { id: reserved.id },
        data: { status: "FAILED", failureReason: "reverted on-chain", txHash },
      });
      return { ok: false, reason: "send_failed", detail: "the payout transaction reverted on-chain" };
    }
    await prisma.withdrawal.update({
      where: { id: reserved.id },
      data: { status: "CONFIRMED", txHash, confirmedAt: new Date() },
    });
    return { ok: true, amountMix: reserved.amountMix, txHash };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await prisma.withdrawal
      .update({ where: { id: reserved.id }, data: { status: "FAILED", failureReason: detail } })
      .catch(() => undefined);
    return { ok: false, reason: "send_failed", detail };
  }
}

// Purely informational — never gates the withdraw route (that would
// require assuming the treasury's native-gas balance is even readable
// the same way on every chain); surfaced so an admin can see at a glance
// whether the treasury needs topping up. formatUnits import kept local
// to this helper since it's the only caller.
export async function getTreasuryMixBalance(): Promise<number | null> {
  const account = getTreasuryAccount();
  if (!account) return null;
  try {
    const client = getPublicClient();
    const decimals = await getMixDecimals();
    const raw = await client.readContract({
      address: getAddress(MIX_TOKEN_ADDRESS),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    return Number(formatUnits(raw, decimals));
  } catch {
    return null;
  }
}
