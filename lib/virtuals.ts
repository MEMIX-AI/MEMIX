// Client for Virtuals' OpenAI-compatible compute endpoint — the free
// inference credit the Librarian's verdict reasoning runs on (see
// lib/verdict-generator.ts). Deliberately just `fetch`, no SDK: this is
// one endpoint shape (POST /chat/completions, Bearer auth, OpenAI-style
// request/response), not worth a dependency for.
const VIRTUALS_BASE_URL = "https://compute.virtuals.io/v1";
const DEFAULT_MODEL = "claude-opus-4-7-fast";
const DEFAULT_FALLBACK_MODEL = "moonshotai-kimi-k3";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface VirtualsChatResult {
  content: string;
  model: string;
}

async function callModelOnce(model: string, messages: ChatMessage[]): Promise<VirtualsChatResult> {
  const apiKey = process.env.VIRTUALS_API_KEY;
  if (!apiKey) {
    throw new Error("VIRTUALS_API_KEY is not set");
  }

  const res = await fetch(`${VIRTUALS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 600,
    }),
    // This has no business hanging for minutes — the caller (an admin
    // clicking a button) needs a real answer within one request/response
    // cycle, not eventually.
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Virtuals API (${model}) responded ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`Virtuals API (${model}) returned no content`);
  }

  return { content, model };
}

// Tries the configured primary model first, then the configured fallback
// once if the primary fails for any reason (network error, non-2xx,
// empty content) — matches "Model: claude-opus-4-7-fast (fallback
// moonshotai-kimi-k3)" from the brief. Both are env-configurable so a
// model rename/deprecation on Virtuals' side doesn't need a code change.
export async function callVirtualsChat(messages: ChatMessage[]): Promise<VirtualsChatResult> {
  const primary = process.env.VIRTUALS_MODEL || DEFAULT_MODEL;
  const fallback = process.env.VIRTUALS_MODEL_FALLBACK || DEFAULT_FALLBACK_MODEL;

  try {
    return await callModelOnce(primary, messages);
  } catch (primaryErr) {
    const primaryMessage = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    if (!fallback || fallback === primary) {
      throw new Error(primaryMessage);
    }
    try {
      return await callModelOnce(fallback, messages);
    } catch (fallbackErr) {
      const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new Error(
        `primary model "${primary}" failed: ${primaryMessage}; fallback "${fallback}" failed: ${fallbackMessage}`,
      );
    }
  }
}
