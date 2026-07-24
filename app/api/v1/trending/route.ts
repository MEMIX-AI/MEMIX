import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiData, apiError } from "@/lib/api-response";
import { serializeAsset } from "@/lib/api-dto";
import { getTrendingAssets } from "@/lib/assets";

const MAX_LIMIT = 50;

// GET /api/v1/trending?limit=&days=
//
// `days` is accepted for forward compatibility but currently ignored — the
// window is fixed at 7 days (see lib/assets.ts#getTrendingAssets, backed
// by a real DownloadEvent log, not an all-time approximation anymore).
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.error, auth.status);

  const { searchParams } = req.nextUrl;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10),
  );

  const assets = await getTrendingAssets(limit);
  const origin = req.nextUrl.origin;
  const serialized = await Promise.all(assets.map((asset) => serializeAsset(asset, origin)));

  return apiData(serialized);
}
