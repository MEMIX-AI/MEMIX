import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere } from "@/lib/asset-visibility";
import { getClientIp } from "@/lib/ip-hash";
import { checkRateLimit } from "@/lib/rate-limit";
import { isAssetType, searchAssets } from "@/lib/search";
import { getAssetById, getTrendingAssets } from "@/lib/assets";
import { LIBRARIAN_SYSTEM_PROMPT } from "@/lib/librarian-prompt";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOOL_ITERATIONS = 4;
const MAX_SURFACED_ASSETS = 12;

// Read-only by construction: these are the only three functions the model
// can call, and none of them can mutate anything. There is no write tool
// for it to reach for, by design (see CLAUDE.md — the Librarian never
// touches the library, only looks at it).
const TOOLS: Anthropic.Tool[] = [
  {
    name: "searchAssets",
    description:
      "Search the meme library by free-text query, asset type, and/or a single tag. Use this whenever the user describes what they want, even loosely (e.g. 'sound for a fail video' -> query: 'fail').",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text search across title, description, and tags",
        },
        type: {
          type: "string",
          enum: ["IMAGE", "VIDEO", "SOUND"],
          description: "Filter to one asset type",
        },
        tag: {
          type: "string",
          description: "Filter to an exact tag name",
        },
      },
    },
  },
  {
    name: "getTrending",
    description:
      "Get the most-downloaded assets in the library right now, for recommendation requests like 'what's popular'. The day-window is best-effort only — currently an all-time top-downloads approximation, not a true rolling window.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Rolling window in days (best-effort, currently ignored)",
        },
        limit: {
          type: "number",
          description: "How many results to return (default 5, max 10)",
        },
      },
    },
  },
  {
    name: "getAssetById",
    description:
      "Get full details for one specific asset by its id — useful after a search, to explain a specific pick.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
      },
      required: ["id"],
    },
  },
];

function toolSummary(asset: { id: string; title: string; type: string; thumbnailUrl: string | null; downloadCount: number; tags: { name: string }[] }) {
  return {
    id: asset.id,
    title: asset.title,
    type: asset.type,
    thumbnailUrl: asset.thumbnailUrl,
    downloadCount: asset.downloadCount,
    tags: asset.tags.map((t) => t.name),
  };
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
  surfacedIds: Set<string>,
): Promise<unknown> {
  switch (name) {
    case "searchAssets": {
      const rawType = typeof input?.type === "string" ? input.type : undefined;
      const type = isAssetType(rawType) ? rawType : undefined;
      const result = await searchAssets({
        q: typeof input?.query === "string" ? input.query : undefined,
        type,
        tag: typeof input?.tag === "string" ? input.tag : undefined,
        pageSize: 8,
      });
      result.assets.forEach((a) => surfacedIds.add(a.id));
      return { total: result.total, assets: result.assets.map(toolSummary) };
    }
    case "getTrending": {
      const limit = Math.min(Math.max(Number(input?.limit) || 5, 1), 10);
      const assets = await getTrendingAssets(limit);
      assets.forEach((a) => surfacedIds.add(a.id));
      return { assets: assets.map(toolSummary) };
    }
    case "getAssetById": {
      const asset = await getAssetById(String(input?.id ?? ""));
      if (!asset) return { error: "not found" };
      surfacedIds.add(asset.id);
      return { asset: toolSummary(asset) };
    }
    default:
      return { error: `unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "the librarian isn't configured yet (missing ANTHROPIC_API_KEY)" },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`librarian:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
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

  const conversation: Anthropic.MessageParam[] = rawMessages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m: { role?: string; content?: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, MAX_MESSAGE_LENGTH),
    }));

  const client = new Anthropic();
  const surfacedIds = new Set<string>();
  let finalText = "";

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: LIBRARIAN_SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      if (toolUses.length === 0) {
        finalText = textBlocks;
        break;
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await runTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          surfacedIds,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }
      conversation.push({ role: "user", content: toolResults });

      if (i === MAX_TOOL_ITERATIONS - 1) {
        finalText = textBlocks || "hit my tool-call limit for this turn — try rephrasing?";
      }
    }
  } catch (err) {
    console.error("librarian error:", err);
    return NextResponse.json(
      { error: "the librarian is having a moment — try again" },
      { status: 502 },
    );
  }

  const assets = surfacedIds.size
    ? await prisma.asset.findMany({
        where: { id: { in: Array.from(surfacedIds) }, ...publicAssetWhere },
        include: { tags: true },
        take: MAX_SURFACED_ASSETS,
      })
    : [];

  return NextResponse.json({ reply: finalText, assets });
}
