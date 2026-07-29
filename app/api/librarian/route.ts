import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/ip-hash";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchAssets } from "@/lib/search";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";

const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_MESSAGE_LENGTH = 500;
const MAX_RESULTS = 5;

// Free version: no LLM call at all — keyword search against the exact
// same query lib/search.ts#searchAssets() runs for /library, dressed up
// with a few hardcoded "persona" lines. Read-only by construction, same
// as the LLM version was — there was never a write path here to remove.

// Common filler words/phrases people type around an actual search term
// ("cariin", "tolong carikan", "find me", "dong") — stripped so the
// leftover text is closer to an actual keyword. Deliberately not NLP,
// just a flat list per the brief ("tidak perlu NLP canggih").
const FILLER_PATTERNS: RegExp[] = [
  /\b(please|pls|can you|could you|would you|i want|i need|i'm looking for|looking for|find me|find|search for|search|show me|give me|get me)\b/gi,
  /\b(tolong|carikan|cariin|cari(?:in|kan)?|aku mau|saya mau|gue mau|gw mau|mau cari|dong|ya|deh|nih|donk)\b/gi,
];

function cleanQuery(raw: string): string {
  let q = raw.toLowerCase();
  for (const pattern of FILLER_PATTERNS) {
    q = q.replace(pattern, " ");
  }
  return q.replace(/\s+/g, " ").trim();
}

const FOUND_OPENERS = [
  "found a few things that might work —",
  "here's what the library has on that —",
  "pulled these from the shelf —",
];

const EMPTY_REPLY =
  "nothing in the library matches that yet — try browsing directly?";

const TOO_SHORT_REPLY = "give me a bit more to search — a name, a vibe, a format?";

function pickOpener(): string {
  return FOUND_OPENERS[Math.floor(Math.random() * FOUND_OPENERS.length)];
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rateLimit = await checkRateLimit(`librarian:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "rate limit reached — try again in a bit" },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
  if (!rawMessages || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  // The widget always appends the new user message as the last array
  // entry before posting (see LibrarianWidget.tsx#send()) — no need to
  // scan conversation history for it.
  const lastMessage = rawMessages[rawMessages.length - 1];
  const rawQuery = String(lastMessage?.content ?? "").slice(0, MAX_MESSAGE_LENGTH);
  const query = cleanQuery(rawQuery);

  if (!query) {
    return NextResponse.json({ reply: TOO_SHORT_REPLY, assets: [] });
  }

  const { assets: rawAssets } = await searchAssets({ q: query, pageSize: MAX_RESULTS });

  if (rawAssets.length === 0) {
    return NextResponse.json({ reply: EMPTY_REPLY, assets: [] });
  }

  const assets = await resolveAssetUrlsMany(rawAssets);
  return NextResponse.json({ reply: pickOpener(), assets });
}
