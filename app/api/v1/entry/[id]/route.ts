import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiData, apiError } from "@/lib/api-response";
import { serializeAsset } from "@/lib/api-dto";
import { getAssetById } from "@/lib/assets";

// ACP skill: meme_verdict — full record for one specific entry.
//
// GET /api/v1/entry/:id
//
// Same real lookup as /api/v1/assets/:id (getAssetById + serializeAsset)
// under a dedicated path for ACP skill registration. See
// serializeAsset() in lib/api-dto.ts for exactly which fields are real
// today — there is no "verdict" (status/peaked/works_when/avoid_when)
// data in the schema yet, so this does not fabricate those fields; see
// the /docs page's own "not what the API returns today" disclaimer.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.error, auth.status);

  const asset = await getAssetById(params.id);
  if (!asset) return apiError("entry not found", 404);

  return apiData(await serializeAsset(asset, req.nextUrl.origin));
}
