import path from "path";
import { NextRequest, NextResponse } from "next/server";
import type { Hash } from "viem";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isMarketplaceEnabled, verifyAndRecordPurchase } from "@/lib/marketplace";

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

// The actual money-safety endpoint. Buyer has already sent both ERC-20
// transfers client-side (see components/marketplace/BuyButton.tsx) and
// hands us the two resulting tx hashes — everything from here on is
// re-derived independently from ROBINHOOD_RPC_URL (lib/marketplace.ts),
// never taken on the frontend's word. Delivery (a real signed download
// URL, same mechanism as the free download route) only ever happens
// after both legs are confirmed CONFIRMED in the database.
export async function POST(
  req: NextRequest,
  { params }: { params: { assetId: string } },
) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: "the marketplace isn't turned on yet" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required to complete a purchase" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const paymentTxHash = String(body?.paymentTxHash ?? "");
  if (!TX_HASH_RE.test(paymentTxHash)) {
    return NextResponse.json(
      { error: "paymentTxHash must be a real transaction hash" },
      { status: 400 },
    );
  }

  // This is real money changing hands — an infra hiccup (RPC misconfigured
  // or briefly unreachable, decimals() call failing, anything
  // verifyAndRecordPurchase didn't already turn into a structured result)
  // must come back as a clean, honest error, never a bare 500/crashed
  // response. Caught here, not swallowed: it's still logged, and the
  // buyer's two real transactions are untouched either way — nothing
  // about this failure mode can lose or misdirect their payment, it just
  // means verification couldn't complete yet.
  let result;
  try {
    result = await verifyAndRecordPurchase({
      assetId: params.assetId,
      buyerWallet: user.walletAddress,
      paymentTxHash: paymentTxHash as Hash,
    });
  } catch (err) {
    console.error(`marketplace purchase verification crashed for asset ${params.assetId}:`, err);
    return NextResponse.json(
      {
        ok: false,
        error: "couldn't verify this payment right now — your transactions are unaffected, try again shortly",
      },
      { status: 503 },
    );
  }

  if (result.ok) {
    const asset = await prisma.asset.findUnique({ where: { id: params.assetId } });
    if (!asset) {
      // Shouldn't happen (the listing lookup inside verifyAndRecordPurchase
      // already requires the asset to exist) — handled defensively rather
      // than asserted, since this response still needs to tell the buyer
      // their payment WAS recorded even if delivery itself hit a snag.
      return NextResponse.json({
        ok: true,
        purchase: result.purchase,
        downloadUrl: null,
        error: "payment confirmed, but the file couldn't be located — contact support with this purchase id",
      });
    }
    const ext = path.extname(asset.fileUrl);
    const downloadUrl = await storage.getUrl(asset.fileUrl, {
      downloadFilename: `${slugify(asset.title)}${ext}`,
    });
    return NextResponse.json({ ok: true, purchase: result.purchase, downloadUrl });
  }

  switch (result.reason) {
    case "not_listed":
      return NextResponse.json({ ok: false, error: "this asset isn't for sale" }, { status: 404 });
    case "treasury_not_configured":
      return NextResponse.json(
        { ok: false, error: "the marketplace's treasury wallet isn't configured — purchases are paused" },
        { status: 503 },
      );
    case "hash_already_used":
      return NextResponse.json(
        { ok: false, error: "this transaction hash has already been used for a purchase" },
        { status: 409 },
      );
    case "pending":
      return NextResponse.json(
        {
          ok: false,
          error: "the payment isn't confirmed on-chain yet — wait a moment and try again",
          pending: true,
        },
        { status: 202 },
      );
    case "verification_failed":
      return NextResponse.json(
        {
          ok: false,
          error: `the payment didn't verify (${humanizeReason(result.detail)}) — no access has been granted`,
        },
        { status: 402 },
      );
    case "rpc_unavailable":
      return NextResponse.json(
        {
          ok: false,
          error: "couldn't reach the chain to verify this payment — your transactions are unaffected, try again shortly",
        },
        { status: 503 },
      );
  }
}

function humanizeReason(detail: string): string {
  switch (detail) {
    case "reverted":
      return "the transaction reverted on-chain";
    case "wrong_from":
      return "sent from a different wallet than the one signed in";
    case "wrong_to":
    case "no_transfer_found":
      return "not sent to the expected recipient";
    case "wrong_amount":
      return "amount doesn't match the expected split";
    case "wrong_token":
      return "not a $MIX transfer";
    case "rpc_error":
      return "couldn't reach the chain to verify — try again shortly";
    default:
      return detail;
  }
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "download";
}
