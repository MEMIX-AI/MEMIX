import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { apiData, apiError } from "@/lib/api-response";
import { serializeAsset } from "@/lib/api-dto";
import { getAssetById } from "@/lib/assets";

// GET /api/v1/assets/:id
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.error, auth.status);

  const asset = await getAssetById(params.id);
  if (!asset) return apiError("asset not found", 404);

  return apiData(serializeAsset(asset, req.nextUrl.origin));
}
