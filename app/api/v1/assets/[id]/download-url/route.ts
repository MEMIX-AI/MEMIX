import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiData, apiError } from "@/lib/api-response";
import { getAssetById } from "@/lib/assets";

// GET /api/v1/assets/:id/download-url
//
// Hands back the canonical URL to fetch, rather than the file bytes
// directly — this indirection is what lets the actual storage location
// change later (e.g. a signed/expiring Supabase Storage URL) without
// breaking callers who already have this response shape. Points at the
// same human-facing download route (which already increments
// downloadCount and sets Content-Disposition) rather than duplicating
// that logic — so the count only increments once, when the URL is
// actually fetched, not when it's merely requested here.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.error, auth.status);

  const asset = await getAssetById(params.id);
  if (!asset) return apiError("asset not found", 404);

  const url = new URL(`/api/assets/${asset.id}/download`, req.nextUrl.origin).toString();
  return apiData({ url, expiresAt: null });
}
