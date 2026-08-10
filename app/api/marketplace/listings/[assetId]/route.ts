import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMarketplaceEnabled } from "@/lib/marketplace";

const MAX_PRICE_MIX = 1_000_000_000;

// Listing an asset for sale, and taking it back down — owner-only, same
// ownership-check shape as app/api/assets/[id]/publish/route.ts. Both
// verbs 503 while MARKETPLACE_ENABLED is off (default): nothing about
// listing state can change until the owner explicitly turns the feature
// on, matching "default OFF sampai aku test tuntas" for every marketplace
// surface, not just the storefront/purchase path.
export async function POST(
  req: NextRequest,
  { params }: { params: { assetId: string } },
) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: "the marketplace isn't turned on yet" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const priceMix = Number(body?.priceMix);
  if (!Number.isFinite(priceMix) || priceMix <= 0 || priceMix > MAX_PRICE_MIX) {
    return NextResponse.json({ error: "priceMix must be a positive number" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: params.assetId },
    include: { declaration: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (asset.uploaderWallet !== user.walletAddress) {
    return NextResponse.json(
      { error: "you can only list your own assets" },
      { status: 403 },
    );
  }
  // The uploader's own "I made this" declaration (see CLAUDE.md POSISI
  // LEGAL #2/#3 — only original creator work is ever allowed behind a
  // paid feature) — every upload has *a* declaration, but only an
  // isOriginal=true one claims actual authorship rather than just
  // rights-to-redistribute.
  if (!asset.isOriginal || !asset.declaration) {
    return NextResponse.json(
      { error: "only assets marked as your own original work can be listed for sale" },
      { status: 403 },
    );
  }
  if (asset.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "asset must be active (not a draft or taken down) to list it" },
      { status: 400 },
    );
  }
  if (asset.visibility !== "PUBLIC") {
    return NextResponse.json(
      { error: "asset must be public to list it in the storefront" },
      { status: 400 },
    );
  }

  const listing = await prisma.marketplaceListing.upsert({
    where: { assetId: asset.id },
    create: {
      assetId: asset.id,
      sellerWallet: user.walletAddress,
      priceMix,
      active: true,
    },
    update: {
      priceMix,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, listing });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { assetId: string } },
) {
  if (!isMarketplaceEnabled()) {
    return NextResponse.json({ error: "the marketplace isn't turned on yet" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const listing = await prisma.marketplaceListing.findUnique({
    where: { assetId: params.assetId },
  });
  if (!listing) {
    return NextResponse.json({ error: "not listed" }, { status: 404 });
  }
  if (listing.sellerWallet !== user.walletAddress) {
    return NextResponse.json({ error: "you can only unlist your own listings" }, { status: 403 });
  }

  await prisma.marketplaceListing.update({
    where: { assetId: params.assetId },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
