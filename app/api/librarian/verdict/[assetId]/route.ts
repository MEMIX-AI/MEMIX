import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVerdictForAsset } from "@/lib/verdict-generator";
import {
  isLibrarianPublicEnabled,
  getWalletTier,
  globalUsageToday,
  globalDailyCap,
  walletUsageToday,
  quotaForTier,
  minMixHold,
} from "@/lib/librarian-access";

// Public, wallet-gated verdict generation — token-gate + rate-limit layer
// in front of the same generateVerdictForAsset() the admin panel uses.
// Default OFF (LIBRARIAN_PUBLIC_ENABLED): every request 503s until that's
// explicitly flipped on, regardless of tier/quota/anything else below.
export async function POST(
  _req: NextRequest,
  { params }: { params: { assetId: string } },
) {
  if (!isLibrarianPublicEnabled()) {
    return NextResponse.json(
      { error: "public Librarian verdict access isn't turned on yet" },
      { status: 503 },
    );
  }

  // A wallet identity is required to have any tier/quota to check against
  // at all — there's no meaningful "FREE tier" for a request with no
  // wallet to attach a daily count to.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "connect your wallet to ask the Librarian for a verdict" },
      { status: 401 },
    );
  }

  const { tier, balance } = await getWalletTier(user.walletAddress);

  // Global cap checked first — the last line of defense against the
  // Virtuals credit budget regardless of how many individual wallets are
  // under their own quota.
  const globalCap = globalDailyCap();
  const globalUsed = await globalUsageToday();
  if (globalUsed >= globalCap) {
    return NextResponse.json(
      {
        ok: false,
        error: "the Librarian has hit its shared daily limit for everyone — try again tomorrow",
        tier,
      },
      { status: 429 },
    );
  }

  const quota = quotaForTier(tier);
  const walletUsed = await walletUsageToday(user.walletAddress);
  if (walletUsed >= quota) {
    const upsell =
      tier === "FREE"
        ? ` Hold ${minMixHold().toLocaleString()}+ $MIX to unlock a higher daily limit.`
        : "";
    return NextResponse.json(
      {
        ok: false,
        error: `you've used your daily Librarian quota (${walletUsed}/${quota}).${upsell}`,
        tier,
      },
      { status: 429 },
    );
  }

  const result = await generateVerdictForAsset(params.assetId);

  // Only log (and thus count against the wallet's/global quota) an
  // outcome that actually reached Virtuals and spent a real call — a
  // cache-hit, a not-found asset, or the admin feature's own shared
  // VERDICT_DAILY_CAP all fail before any credit is spent, so none of
  // them should cost this wallet part of its daily allowance.
  const spentACall = result.ok || result.reason === "llm_failed";
  if (spentACall) {
    await prisma.librarianPublicUsageLog.create({
      data: {
        walletAddress: user.walletAddress.toLowerCase(),
        tier,
        assetId: params.assetId,
        success: result.ok,
        errorMessage: !result.ok && result.reason === "llm_failed" ? result.error : null,
      },
    });
  }

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      verdict: result.verdict,
      tier,
      balance,
      usage: {
        wallet: walletUsed + 1,
        walletQuota: quota,
        global: globalUsed + 1,
        globalCap,
      },
    });
  }

  switch (result.reason) {
    case "not_found":
      return NextResponse.json({ ok: false, error: "asset not found", tier }, { status: 404 });

    case "already_verdicted": {
      // Not an error from the requester's point of view — they wanted a
      // verdict and one already exists (admin- or previously
      // AI-generated). Hand it back instead of a bare rejection, and
      // don't touch the quota, since no call was made.
      const asset = await prisma.asset.findUnique({
        where: { id: params.assetId },
        select: { verdictStatus: true, worksWhen: true, avoidWhen: true },
      });
      return NextResponse.json({
        ok: true,
        alreadyExisted: true,
        verdict: asset
          ? { status: asset.verdictStatus, worksWhen: asset.worksWhen, avoidWhen: asset.avoidWhen }
          : null,
        tier,
      });
    }

    case "daily_cap_reached":
      return NextResponse.json(
        {
          ok: false,
          error: "the Librarian is at its overall generation limit right now — try again later",
          tier,
        },
        { status: 429 },
      );

    case "llm_failed":
      return NextResponse.json(
        {
          ok: false,
          error: "the Librarian couldn't reach its reasoning model — try again later",
          tier,
        },
        { status: 502 },
      );
  }
}
