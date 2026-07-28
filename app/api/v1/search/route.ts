import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiData, apiError } from "@/lib/api-response";
import { serializeAsset } from "@/lib/api-dto";
import { isAssetType, searchAssets } from "@/lib/search";

// ACP skill: meme_search — search across the catalogue.
//
// GET /api/v1/search?q=&type=&tag=&page=&pageSize=
//
// Deliberately a thin wrapper around the exact same searchAssets()/
// serializeAsset() the existing /api/v1/assets endpoint (and /library,
// and the free Librarian) already use — not a second search
// implementation. Exists as its own route/path because the ACP skill
// registration needs a stable, dedicated path distinct from /assets.
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.error, auth.status);

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const rawType = searchParams.get("type") ?? undefined;
  const type = isAssetType(rawType) ? rawType : undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20),
  );

  const result = await searchAssets({ q, type, tag, page, pageSize });
  const origin = req.nextUrl.origin;
  const serialized = await Promise.all(
    result.assets.map((asset) => serializeAsset(asset, origin)),
  );

  return apiData(serialized, {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
  });
}
