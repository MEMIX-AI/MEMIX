import type { Asset, Tag } from "@prisma/client";
import type { ChatMessage } from "./virtuals";
import { callVirtualsChat } from "./virtuals";
import { searchAssets } from "./search";
import { resolveAssetUrlsMany } from "./asset-urls";

const MAX_MESSAGE_LENGTH = 500;
// Last N messages (both roles) sent as context — bounds token cost per
// call regardless of how long a conversation runs; this is a chat about
// memes, not a long-context research assistant.
const MAX_HISTORY_MESSAGES = 8;
const CATALOG_CONTEXT_SIZE = 5;

// Same filler-stripping the old pure-keyword version used
// (app/api/librarian/route.ts's prior implementation) — still useful
// here for turning a conversational message into a decent search query
// for catalogue grounding, even though the reply itself now comes from
// real reasoning, not keyword matching.
const FILLER_PATTERNS: RegExp[] = [
  /\b(please|pls|can you|could you|would you|i want|i need|i'm looking for|looking for|find me|find|search for|search|show me|give me|get me|what is|what's|tell me about|explain)\b/gi,
  /\b(tolong|carikan|cariin|cari(?:in|kan)?|aku mau|saya mau|gue mau|gw mau|mau cari|dong|ya|deh|nih|donk|apa itu|jelasin)\b/gi,
];

function extractSearchQuery(raw: string): string {
  let q = raw.toLowerCase();
  for (const pattern of FILLER_PATTERNS) {
    q = q.replace(pattern, " ");
  }
  return q.replace(/\s+/g, " ").trim();
}

// Deliberately narrow — three functions, nothing else. Every hard rule
// below exists because a general-purpose "helpful assistant" persona is
// exactly what this must NOT be: it should refuse, not improvise, the
// moment a question leaves memes.
const SYSTEM_PROMPT = `You are The Librarian — memix's meme specialist. You do exactly three things, and nothing else:

1. EDUCATE — explain a meme's origin, context, or why it's funny.
2. VERDICT — judge a meme: its vibe, a status (LIVE, DATED, or DEAD), when it works, and when to avoid it. Keep this tightly formatted — short labeled lines, not a wall of prose.
3. RECOMMEND — suggest what kind of meme fits a situation or mood. If real catalogue matches are given to you as context below, offer them by exact title; if none fit, say so honestly instead of forcing a recommendation.

Persona: a meme expert who is direct and a little witty — never a generic "helpful assistant." Short, confident answers. No filler like "Great question!", no unnecessary disclaimers.

Hard rules — never break these:
- You ONLY talk about memes: education, verdict, or recommendation. Anything else — even if related to memix the company, crypto, $MIX, or general chit-chat — gets exactly this redirect and nothing more: "I'm the Librarian — I deal in memes. Want a vibe check or a verdict on something?"
- You NEVER answer questions about price, market data, tokens, news, or anything needing live/current information. Say plainly: "I don't have live data access for that." Never invent a number, a price, or a headline.
- If you don't know something, say you don't know. Never fabricate facts, dates, or origins you aren't confident about.
- If recommending a specific catalogue item, ONLY reference titles given to you in the "Catalogue matches" context — never invent a title that wasn't given to you. If no context is given or nothing fits, say honestly that nothing in the catalogue matches right now.`;

export interface LibrarianChatResult {
  reply: string;
  assets: (Asset & { tags: Tag[] })[];
  model: string;
}

export interface LibrarianChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askLibrarian(
  history: LibrarianChatMessage[],
): Promise<LibrarianChatResult> {
  const trimmedHistory = history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ ...m, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  const lastUserMessage = [...trimmedHistory].reverse().find((m) => m.role === "user")?.content ?? "";

  // A plain DB search, not an LLM call — cheap grounding so RECOMMEND
  // answers can point at real titles instead of inventing them. Run
  // regardless of which of the 3 functions the user is actually asking
  // for; the system prompt tells the model when this context is/isn't
  // relevant, so no separate classification step (and no second LLM
  // call) is needed just to decide whether to search first.
  const query = extractSearchQuery(lastUserMessage);
  const { assets: candidateRaw } = query
    ? await searchAssets({ q: query, pageSize: CATALOG_CONTEXT_SIZE })
    : { assets: [] };

  const catalogContext =
    candidateRaw.length > 0
      ? `Catalogue matches for this query (use ONLY these exact titles if recommending something specific — never invent a title):\n${candidateRaw
          .map((a) => {
            const tags = a.tags.map((t) => t.name).join(", ");
            const verdict = a.verdictStatus ? `, verdict: ${a.verdictStatus}` : ", unverdicted";
            return `- "${a.title}" (${a.type}${tags ? `, tags: ${tags}` : ""}${verdict})`;
          })
          .join("\n")}`
      : "No catalogue matches found for this query — if asked for a recommendation, say honestly that nothing in the catalogue fits right now.";

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${catalogContext}` },
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const { content, model } = await callVirtualsChat(messages);

  // Only attach asset cards the reply actually name-checks — avoids
  // showing candidates the model looked at but didn't end up
  // recommending (e.g. it judged them a bad fit and said so).
  const mentioned = candidateRaw.filter((a) => content.includes(a.title));
  const assets = mentioned.length > 0 ? await resolveAssetUrlsMany(mentioned) : [];

  return { reply: content, assets, model };
}
