import type { VerdictStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { callVirtualsChat } from "./virtuals";

const VALID_STATUSES: VerdictStatus[] = ["EMERGING", "LIVE", "PEAKING", "FADING", "DATED", "DEAD"];
const DEFAULT_DAILY_CAP = 50;

export interface GeneratedVerdict {
  status: VerdictStatus;
  worksWhen: string;
  avoidWhen: string;
  vibe: string;
}

export interface UsageInfo {
  used: number;
  cap: number;
}

export type GenerateVerdictResult =
  | { ok: true; verdict: GeneratedVerdict; usage: UsageInfo }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already_verdicted" }
  | { ok: false; reason: "daily_cap_reached"; usage: UsageInfo }
  | { ok: false; reason: "llm_failed"; error: string; usage: UsageInfo };

function dailyCap(): number {
  const parsed = Number(process.env.VERDICT_DAILY_CAP);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_DAILY_CAP;
}

function todayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Every row in VerdictGenerationLog is one real outbound call already made
// (see schema comment) — counting them since UTC midnight is the actual
// spend for today, regardless of how many of those calls succeeded.
async function usedToday(): Promise<number> {
  return prisma.verdictGenerationLog.count({ where: { createdAt: { gte: todayStartUTC() } } });
}

function buildPrompt(asset: {
  title: string;
  description: string;
  type: string;
  tags: { name: string }[];
}): { system: string; user: string } {
  const system = `You are The Librarian, a blunt but fair judge of internet memes for a meme catalogue called memix.
Given a meme's metadata, decide honestly whether it still works today or has aged out. Never invent facts you weren't given — reason only from the title, description, type, and tags provided.
Respond with ONLY a raw JSON object — no markdown code fences, no commentary before or after — matching exactly this shape:
{"vibe": "one or two words for the genre/vibe, e.g. reaction, wojak, gaming, wholesome", "status": "one of EMERGING, LIVE, PEAKING, FADING, DATED, DEAD", "works_when": "one honest sentence: the situation where this meme actually lands", "avoid_when": "one honest sentence: the situation where using this meme would flop or feel dated"}`;

  const tagList = asset.tags.map((t) => t.name).join(", ") || "(none)";
  const user = `Title: ${asset.title}
Type: ${asset.type}
Description: ${asset.description || "(none provided)"}
Existing tags: ${tagList}`;

  return { system, user };
}

function parseVerdictJson(raw: string): GeneratedVerdict | null {
  // Models sometimes wrap JSON in ```json fences despite instructions not
  // to — strip if present rather than failing an otherwise-valid answer.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const d = data as Record<string, unknown>;
  const status = typeof d.status === "string" ? d.status.trim().toUpperCase() : null;
  const worksWhen = typeof d.works_when === "string" ? d.works_when.trim() : null;
  const avoidWhen = typeof d.avoid_when === "string" ? d.avoid_when.trim() : null;
  const vibe = typeof d.vibe === "string" ? d.vibe.trim() : null;

  if (!status || !VALID_STATUSES.includes(status as VerdictStatus)) return null;
  if (!worksWhen || !avoidWhen || !vibe) return null;

  return { status: status as VerdictStatus, worksWhen, avoidWhen, vibe };
}

// Admin/manual-triggered only (see app/api/admin/assets/[id]/verdict/
// generate/route.ts and the batch route) — never called from the upload
// path. Cache-skips anything already verdicted, enforces the daily call
// cap BEFORE spending a call, and never writes a placeholder/dummy
// verdict: a failure (cap reached, bad JSON, network error) always
// leaves the asset exactly as unverdicted as it was, logged for review.
export async function generateVerdictForAsset(assetId: string): Promise<GenerateVerdictResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { tags: true },
  });
  if (!asset) return { ok: false, reason: "not_found" };

  // Cache — an asset that already carries a verdict opinion (admin- or
  // AI-given) is never silently overwritten by a fresh generation run.
  if (asset.verdictStatus) return { ok: false, reason: "already_verdicted" };

  const cap = dailyCap();
  const used = await usedToday();
  if (used >= cap) return { ok: false, reason: "daily_cap_reached", usage: { used, cap } };

  const { system, user } = buildPrompt(asset);

  let raw: string;
  let modelUsed: string;
  try {
    const result = await callVirtualsChat([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    raw = result.content;
    modelUsed = result.model;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.verdictGenerationLog.create({
      data: { assetId, success: false, errorMessage: message.slice(0, 500) },
    });
    return { ok: false, reason: "llm_failed", error: message, usage: { used: used + 1, cap } };
  }

  const parsed = parseVerdictJson(raw);
  if (!parsed) {
    await prisma.verdictGenerationLog.create({
      data: {
        assetId,
        success: false,
        model: modelUsed,
        errorMessage: `model returned unparseable/invalid JSON: ${raw.slice(0, 500)}`,
      },
    });
    return {
      ok: false,
      reason: "llm_failed",
      error: "model returned invalid JSON",
      usage: { used: used + 1, cap },
    };
  }

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: assetId },
      data: {
        verdictStatus: parsed.status,
        worksWhen: parsed.worksWhen,
        avoidWhen: parsed.avoidWhen,
      },
    }),
    prisma.verdictGenerationLog.create({
      data: { assetId, success: true, model: modelUsed, vibe: parsed.vibe },
    }),
  ]);

  return { ok: true, verdict: parsed, usage: { used: used + 1, cap } };
}
