# ACP layer plan (Virtuals phase) — planning only, nothing here is built

This is a blueprint for the future paid, agent-facing layer on top of the
free `/api/v1/*` foundation (see [`api.md`](./api.md)). Per CLAUDE.md:
humans stay free forever; this is the "mesin bayar" (machines pay) side,
and it's a later phase — **nothing in this document is implemented**. Each
candidate skill below is scoped to wrap an endpoint/function that already
exists today, so building the real ACP layer later is mostly a thin
wrapper, not new engine work.

## Design constraints carried over from the rest of the platform

- **Read-only, same as `/api/v1/*` and The Librarian.** No skill here
  writes, deletes, or moderates anything — that stays human-only (upload
  flow, admin panel).
- **No license claims.** Same guardrail as The Librarian's system prompt
  (`lib/librarian-prompt.ts`): a skill can return whatever user-uploaded
  results exist for a copyrighted-sounding query, but never asserts a
  license status or legal clearance. Point disputes at `/tos`.
- **Pricing here is a rough placeholder**, not a real price list — actual
  numbers need real inference/bandwidth cost data once this gets built,
  and a real payment rail (this is explicitly the Virtuals-phase problem,
  not solved here).

---

## 1. `meme_search`

Free-text/tag search over the library — the ACP-facing version of
`GET /api/v1/assets`.

- **Input:** `{ query: string, type?: "IMAGE"|"VIDEO"|"SOUND", tag?: string, limit?: number }`
- **Output:** `{ results: [{ id, title, type, url, thumbnailUrl, tags, license }] }` — a trimmed list, not the full DTO; `license` derived the same way `lib/format.ts#licenseBadge()` does (`isOriginal` ⇒ `"commercial"`, else `"free · cc"`).
- **Rough price:** cheapest skill in the set — a plain DB query, no LLM call. Ballpark: **$0.001–0.005 per call** (micro-priced, similar order of magnitude to a cheap embeddings/search API call).
- **Engine call:** `lib/search.ts#searchAssets()` — identical function backing `GET /api/v1/assets`. The handler would just be a thin param-mapping + response-trimming wrapper around it.

## 2. `sound_fetch`

Get a specific sound (by id, or best match for a description) and hand
back a fetchable URL — the ACP-facing version of `GET /api/v1/assets/:id`
+ `GET /api/v1/assets/:id/download-url` chained together.

- **Input:** `{ id?: string, query?: string }` — one of the two required; if `query` is given, resolve to the top search match first.
- **Output:** `{ id, title, url, duration, license }` — `url` is a download URL, not inline bytes (same indirection reasoning as the REST endpoint).
- **Rough price:** slightly above `meme_search` since it delivers an actual fetchable asset, not just a listing. Ballpark: **$0.005–0.02 per call.**
- **Engine call:** `lib/search.ts#searchAssets()` (only when resolving from `query`) + `lib/assets.ts#getAssetById()`, then the same URL-building logic as `app/api/v1/assets/[id]/download-url/route.ts`.

## 3. `trending_digest`

A compact "what's hot" summary — the ACP-facing version of
`GET /api/v1/trending`, but shaped as a digest rather than a raw list.

- **Input:** `{ type?: "IMAGE"|"VIDEO"|"SOUND", limit?: number, days?: number }` (`days` inherits the same "currently ignored, all-time approximation" caveat as the REST endpoint until a real `DownloadEvent` log exists).
- **Output:** `{ digest: [{ id, title, url, downloadCount }], generatedAt }` — no LLM-authored blurb in v1 of this skill; it's a formatted version of the trending list, not a written summary. (A future version could add a one-line blurb per pick, at which point it'd need the same LLM-call cost profile as `vibe_match` below.)
- **Rough price:** same order as `meme_search` — no LLM call, just a query + light formatting. Ballpark: **$0.001–0.005 per call.**
- **Engine call:** `lib/assets.ts#getTrendingAssets()` — identical function backing `GET /api/v1/trending` and the homepage's "▍ trending" section.

## 4. `vibe_match`

Given a description of the content an agent is building around (a video's
theme, a post's tone, a project's vibe), pick a small number of assets and
explain the pick — the ACP-facing version of what The Librarian's "vibe
match" chat capability already does conversationally, but as a discrete,
priced, single-call skill instead of a free multi-turn chat.

- **Input:** `{ context: string, count?: number }` (`count` default ~3, capped small — this is a curated pick, not a search result page).
- **Output:** `{ picks: [{ id, title, url, reason }] }` — `reason` is a short (one-line) LLM-generated justification per pick, same voice/persona as The Librarian.
- **Rough price:** highest of the four, since it's the only one that makes a real LLM call server-side. Ballpark: **$0.02–0.05 per call** (covering the underlying Claude API cost of a short tool-calling turn, plus margin) — needs real numbers once actual token usage is measured, not a guess.
- **Engine call:** `lib/search.ts#searchAssets()` for candidates, then a Claude tool-use turn structured like `app/api/librarian/route.ts`'s existing loop (same `claude-opus-4-8` call, same three read-only tools) — constrained to return `count` picks with a one-line `reason` each instead of open-ended chat text. This is the one skill that isn't just "wrap an existing endpoint" — it reuses the librarian's *pattern*, not a single function.

---

## Open questions for whenever this actually gets built

- Payment rail: how does the ACP layer bill per call — this doc assumes
  per-call pricing but the actual mechanism (x402, a prepaid credit
  balance, something else) isn't decided.
- Whether `vibe_match`'s LLM cost should be passed through directly or
  smoothed into a flat per-call price regardless of how much reasoning it
  used.
- Whether these four skills stay separate ACP endpoints or collapse into
  fewer, parameterized ones once real usage patterns are known.
