import { createPublicClient, http, getAddress, parseUnits, formatUnits, parseEventLogs } from "viem";
import type { Address, Hash } from "viem";
import { prisma } from "./prisma";
import { MIX_TOKEN_ADDRESS, ERC20_ABI } from "./erc20";
import type { MarketplacePurchase } from "@prisma/client";

const DEFAULTS = {
  PLATFORM_FEE_PERCENT: 5,
  MARKETPLACE_MIN_CONFIRMATIONS: 1,
};

function numberEnv(name: keyof typeof DEFAULTS): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULTS[name];
}

// Master switch (default OFF). Checked by every marketplace route AND by
// the existing free-download route's purchase gate (lib/marketplace.ts
// is the one place this is read) — while false, a listed asset behaves
// exactly like it always has: freely downloadable, no gate at all.
export function isMarketplaceEnabled(): boolean {
  return process.env.MARKETPLACE_ENABLED === "true";
}

export function platformFeePercent(): number {
  return numberEnv("PLATFORM_FEE_PERCENT");
}

// No fallback address — a missing treasury wallet must fail loudly
// (every purchase attempt rejected with a clear server error) rather
// than silently routing the platform's cut nowhere or, worse, somewhere
// wrong.
export function platformTreasuryWallet(): Address | null {
  const raw = process.env.PLATFORM_TREASURY_WALLET;
  if (!raw) return null;
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

function minConfirmations(): bigint {
  return BigInt(Math.max(0, Math.floor(numberEnv("MARKETPLACE_MIN_CONFIRMATIONS"))));
}

function getPublicClient() {
  const rpcUrl = process.env.ROBINHOOD_RPC_URL;
  if (!rpcUrl) throw new Error("ROBINHOOD_RPC_URL is not set");
  return createPublicClient({ transport: http(rpcUrl) });
}

export async function getMixDecimals(): Promise<number> {
  const client = getPublicClient();
  const decimals = await client.readContract({
    address: getAddress(MIX_TOKEN_ADDRESS),
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  return decimals;
}

export interface SplitAmounts {
  totalRaw: bigint;
  feeRaw: bigint;
  sellerRaw: bigint;
}

// Exact BigInt math, never floating point — feeRaw + sellerRaw always
// sums back to exactly totalRaw (fee computed first via floor division,
// seller gets the remainder), so no fractional base unit is ever lost or
// silently created by rounding on either side of the split.
export function computeSplit(priceMix: number, decimals: number, feePercent: number): SplitAmounts {
  const totalRaw = parseUnits(priceMix.toFixed(decimals), decimals);
  // feePercent as basis points (x100) keeps this in integer math too —
  // feePercent itself comes from an env var and could be a decimal like
  // 2.5, which parseUnits-style truncation would mangle if multiplied
  // directly against totalRaw as a plain float.
  const feeBps = BigInt(Math.round(feePercent * 100));
  const feeRaw = (totalRaw * feeBps) / BigInt(10_000);
  const sellerRaw = totalRaw - feeRaw;
  return { totalRaw, feeRaw, sellerRaw };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_mined" }
  | { ok: false; reason: "reverted" }
  | { ok: false; reason: "not_enough_confirmations" }
  | { ok: false; reason: "wrong_token" | "wrong_from" | "wrong_to" | "wrong_amount" | "no_transfer_found" }
  | { ok: false; reason: "rpc_error"; detail: string };

// The actual safeguard: fetches the real transaction receipt from
// ROBINHOOD_RPC_URL and checks every claim independently — never trusts
// a frontend-supplied amount/recipient. A transaction not yet mined
// returns "not_mined" (retryable, nothing written to the DB by the
// caller); everything else is a definitive verdict on that exact hash.
export async function verifyMixTransfer(params: {
  txHash: Hash;
  expectedFrom: Address;
  expectedTo: Address;
  expectedRawAmount: bigint;
}): Promise<VerifyResult> {
  const client = getPublicClient();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: params.txHash });
  } catch {
    return { ok: false, reason: "not_mined" };
  }
  if (!receipt) return { ok: false, reason: "not_mined" };

  if (receipt.status !== "success") {
    return { ok: false, reason: "reverted" };
  }

  if (getAddress(receipt.from) !== getAddress(params.expectedFrom)) {
    return { ok: false, reason: "wrong_from" };
  }

  let currentBlock: bigint;
  try {
    currentBlock = await client.getBlockNumber();
  } catch (err) {
    return { ok: false, reason: "rpc_error", detail: err instanceof Error ? err.message : String(err) };
  }
  const confirmations = currentBlock - receipt.blockNumber + BigInt(1);
  if (confirmations < minConfirmations()) {
    return { ok: false, reason: "not_enough_confirmations" };
  }

  const tokenLogs = receipt.logs.filter(
    (log) => getAddress(log.address) === getAddress(MIX_TOKEN_ADDRESS),
  );
  if (tokenLogs.length === 0) {
    return { ok: false, reason: "wrong_token" };
  }

  const transfers = parseEventLogs({ abi: ERC20_ABI, eventName: "Transfer", logs: tokenLogs });
  const match = transfers.find(
    (t) =>
      getAddress(t.args.from) === getAddress(params.expectedFrom) &&
      getAddress(t.args.to) === getAddress(params.expectedTo),
  );
  if (!match) {
    return { ok: false, reason: "no_transfer_found" };
  }
  if (match.args.value !== params.expectedRawAmount) {
    return { ok: false, reason: "wrong_amount" };
  }

  return { ok: true };
}

export type PurchaseResult =
  | { ok: true; purchase: MarketplacePurchase }
  | { ok: false; reason: "not_listed" }
  | { ok: false; reason: "treasury_not_configured" }
  | { ok: false; reason: "same_hash_twice" }
  | { ok: false; reason: "hash_already_used" }
  | { ok: false; reason: "pending"; leg: "seller" | "treasury" }
  | { ok: false; reason: "verification_failed"; leg: "seller" | "treasury"; detail: string }
  | { ok: false; reason: "rpc_unavailable"; detail: string };

// Orchestrates a full purchase verification for Opt-in Option A (two
// plain ERC-20 transfers from the buyer, no splitter contract) — see the
// schema comment on MarketplacePurchase for why only a definitively
// reverted leg gets written as FAILED, and everything else that isn't a
// clean success returns without touching the database at all.
export async function verifyAndRecordPurchase(params: {
  assetId: string;
  buyerWallet: string;
  sellerTxHash: Hash;
  treasuryTxHash: Hash;
}): Promise<PurchaseResult> {
  const { assetId, buyerWallet, sellerTxHash, treasuryTxHash } = params;

  if (sellerTxHash.toLowerCase() === treasuryTxHash.toLowerCase()) {
    return { ok: false, reason: "same_hash_twice" };
  }

  const listing = await prisma.marketplaceListing.findUnique({
    where: { assetId },
    include: { asset: true },
  });
  if (!listing || !listing.active || listing.asset.status !== "ACTIVE") {
    return { ok: false, reason: "not_listed" };
  }

  const treasuryWallet = platformTreasuryWallet();
  if (!treasuryWallet) {
    return { ok: false, reason: "treasury_not_configured" };
  }

  const existing = await prisma.marketplacePurchase.findFirst({
    where: {
      OR: [
        { sellerTxHash: { in: [sellerTxHash, treasuryTxHash] } },
        { treasuryTxHash: { in: [sellerTxHash, treasuryTxHash] } },
      ],
    },
  });
  if (existing) {
    return { ok: false, reason: "hash_already_used" };
  }

  let decimals: number;
  try {
    decimals = await getMixDecimals();
  } catch (err) {
    return {
      ok: false,
      reason: "rpc_unavailable",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  const { feeRaw, sellerRaw } = computeSplit(listing.priceMix, decimals, platformFeePercent());
  const buyer = getAddress(buyerWallet);
  const seller = getAddress(listing.sellerWallet);

  let sellerLeg: VerifyResult;
  let treasuryLeg: VerifyResult;
  try {
    sellerLeg = await verifyMixTransfer({
      txHash: sellerTxHash,
      expectedFrom: buyer,
      expectedTo: seller,
      expectedRawAmount: sellerRaw,
    });
  } catch (err) {
    return { ok: false, reason: "rpc_unavailable", detail: err instanceof Error ? err.message : String(err) };
  }
  if (!sellerLeg.ok) {
    if (sellerLeg.reason === "not_mined" || sellerLeg.reason === "not_enough_confirmations") {
      return { ok: false, reason: "pending", leg: "seller" };
    }
    if (sellerLeg.reason === "reverted") {
      await recordFailure({ listing, assetId, buyerWallet: buyer, seller, sellerTxHash, treasuryTxHash: null, feeRaw, sellerRaw, reason: "seller leg reverted" });
    }
    return { ok: false, reason: "verification_failed", leg: "seller", detail: sellerLeg.reason };
  }

  try {
    treasuryLeg = await verifyMixTransfer({
      txHash: treasuryTxHash,
      expectedFrom: buyer,
      expectedTo: treasuryWallet,
      expectedRawAmount: feeRaw,
    });
  } catch (err) {
    return { ok: false, reason: "rpc_unavailable", detail: err instanceof Error ? err.message : String(err) };
  }
  if (!treasuryLeg.ok) {
    if (treasuryLeg.reason === "not_mined" || treasuryLeg.reason === "not_enough_confirmations") {
      return { ok: false, reason: "pending", leg: "treasury" };
    }
    if (treasuryLeg.reason === "reverted") {
      await recordFailure({ listing, assetId, buyerWallet: buyer, seller, sellerTxHash, treasuryTxHash, feeRaw, sellerRaw, reason: "treasury leg reverted" });
    }
    return { ok: false, reason: "verification_failed", leg: "treasury", detail: treasuryLeg.reason };
  }

  try {
    const purchase = await prisma.marketplacePurchase.create({
      data: {
        listingId: listing.id,
        assetId,
        buyerWallet: buyer.toLowerCase(),
        sellerWallet: seller.toLowerCase(),
        priceMix: listing.priceMix,
        platformFeeMix: Number(formatUnits(feeRaw, decimals)),
        sellerAmountMix: Number(formatUnits(sellerRaw, decimals)),
        sellerTxHash,
        treasuryTxHash,
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
    return { ok: true, purchase };
  } catch (err) {
    // Unique constraint on sellerTxHash/treasuryTxHash — the DB-level
    // backstop catching a race the pre-check above didn't (two concurrent
    // requests reaching this point with the same hash at nearly the same
    // moment).
    if (isUniqueConstraintError(err)) {
      return { ok: false, reason: "hash_already_used" };
    }
    throw err;
  }
}

async function recordFailure(params: {
  listing: { id: string };
  assetId: string;
  buyerWallet: Address;
  seller: Address;
  sellerTxHash: string | null;
  treasuryTxHash: string | null;
  feeRaw: bigint;
  sellerRaw: bigint;
  reason: string;
}): Promise<void> {
  await prisma.marketplacePurchase
    .create({
      data: {
        listingId: params.listing.id,
        assetId: params.assetId,
        buyerWallet: params.buyerWallet.toLowerCase(),
        sellerWallet: params.seller.toLowerCase(),
        priceMix: 0,
        platformFeeMix: 0,
        sellerAmountMix: 0,
        sellerTxHash: params.sellerTxHash,
        treasuryTxHash: params.treasuryTxHash,
        status: "FAILED",
        failureReason: params.reason,
      },
    })
    .catch(() => undefined); // a reverted hash colliding with a prior record is not worth crashing the request over
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}
