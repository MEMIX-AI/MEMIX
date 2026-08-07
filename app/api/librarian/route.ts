import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { askLibrarian, type LibrarianChatMessage } from "@/lib/librarian-chat";
import {
  isLibrarianPublicEnabled,
  getWalletTier,
  globalUsageToday,
  globalDailyCap,
  walletUsageToday,
  quotaForTier,
  minMixHold,
} from "@/lib/librarian-access";

const MAX_MESSAGES = 20;

// The Librarian's chat — upgraded from plain keyword search to real LLM
// reasoning (lib/librarian-chat.ts, same Virtuals compute credit as the
// admin verdict generator). Every real reasoning call now goes through
// the exact same token-gate + rate-limit pipeline as the per-asset public
// verdict route (app/api/librarian/verdict/[assetId]/route.ts) — same
// LIBRARIAN_PUBLIC_ENABLED flag (default off), same wallet requirement,
// same FREE/HOLDER daily quota, same GLOBAL_DAILY_CAP, checked BEFORE
// calling the LLM so an over-quota request never spends a real call.
export async function POST(req: NextRequest) {
  if (!isLibrarianPublicEnabled()) {
    return NextResponse.json(
      { error: "the Librarian's reasoning mode isn't turned on yet" },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "connect your wallet to talk to the Librarian" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const rawMessages: unknown[] | null = Array.isArray(body?.messages) ? body.messages : null;
  if (!rawMessages || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const history: LibrarianChatMessage[] = rawMessages
    .slice(-MAX_MESSAGES)
    .filter(
      (m: unknown): m is { role: "user" | "assistant"; content: string } =>
        !!m &&
        typeof m === "object" &&
        ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "the last message must be from the user" }, { status: 400 });
  }

  const { tier } = await getWalletTier(user.walletAddress);

  const globalCap = globalDailyCap();
  const globalUsed = await globalUsageToday();
  if (globalUsed >= globalCap) {
    return NextResponse.json(
      {
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
        error: `you've used your daily Librarian quota (${walletUsed}/${quota}).${upsell}`,
        tier,
      },
      { status: 429 },
    );
  }

  try {
    const result = await askLibrarian(history);

    await prisma.librarianPublicUsageLog.create({
      data: {
        walletAddress: user.walletAddress.toLowerCase(),
        tier,
        assetId: null,
        success: true,
      },
    });

    return NextResponse.json({
      reply: result.reply,
      assets: result.assets,
      tier,
      usage: { wallet: walletUsed + 1, walletQuota: quota, global: globalUsed + 1, globalCap },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await prisma.librarianPublicUsageLog.create({
      data: {
        walletAddress: user.walletAddress.toLowerCase(),
        tier,
        assetId: null,
        success: false,
        errorMessage: message.slice(0, 500),
      },
    });

    return NextResponse.json(
      { error: "the Librarian couldn't reach its reasoning model — try again later", tier },
      { status: 502 },
    );
  }
}
