import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Self-service publish only — an uploader flipping their OWN draft live.
// Deliberately not filtered through publicAssetWhere/assetAccessWhere: a
// DRAFT asset is invisible everywhere by design (see prisma/schema.prisma
// AssetStatus.DRAFT), including to its own owner via the normal
// detail-page access check, so this route looks it up directly and
// checks ownership itself — same pattern as the DELETE route.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const asset = await prisma.asset.findUnique({ where: { id: params.id } });
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (asset.uploaderWallet !== user.walletAddress) {
    return NextResponse.json(
      { error: "you can only publish your own assets" },
      { status: 403 },
    );
  }
  if (asset.status !== "DRAFT") {
    return NextResponse.json({ error: "this asset isn't a draft" }, { status: 400 });
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { status: "ACTIVE" },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
