import { CatalogHero, CatalogSection, PageColophon } from "@/components/docs/CatalogPage";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import { MarketplaceComingSoonCard } from "@/components/MarketplaceComingSoonCard";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { isMarketplaceEnabled } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";

export const metadata = {
  title: "creators — memix",
  description: "Creator profiles and the $MIX marketplace — coming soon.",
};

// Same page, two real states — not a mockup permanently replaced by a
// separate URL. While MARKETPLACE_ENABLED is off (default), this renders
// exactly the coming-soon preview it always has; once flipped on, the
// preview section is replaced by real, live MarketplaceListing rows. No
// other section of this page changes either way.
export default async function CreatorsPage() {
  const marketplaceEnabled = isMarketplaceEnabled();

  const listings = marketplaceEnabled
    ? await prisma.marketplaceListing.findMany({
        where: { active: true, asset: { status: "ACTIVE", visibility: "PUBLIC" } },
        include: { asset: true },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
    : [];

  const resolvedAssets = marketplaceEnabled
    ? await resolveAssetUrlsMany(listings.map((l) => l.asset))
    : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status={marketplaceEnabled ? "the marketplace is live" : "creator program · coming soon"}
        title="Creators get a shelf of their own."
        lede="Creators with genuinely original work get their own public profile. Anyone can browse a directory of creators, open a profile, and see what they've made. Sales are settled in $MIX, with a stablecoin option alongside it so creators aren't fully exposed to token volatility."
      />

      {marketplaceEnabled ? (
        <CatalogSection title="For sale">
          {listings.length === 0 ? (
            <p>nothing listed yet — creators can list original work for sale from my uploads.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {listings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  assetId={listing.assetId}
                  title={resolvedAssets[i].title}
                  thumbnailUrl={resolvedAssets[i].thumbnailUrl}
                  priceMix={listing.priceMix}
                  sellerWallet={listing.sellerWallet}
                />
              ))}
            </div>
          )}
        </CatalogSection>
      ) : (
        <>
          <CatalogSection title="What's live today">
            <p>
              Nothing here yet — this page is a preview of what&apos;s planned
              (roadmap item R06), not a working feature. No profiles, no
              earnings, no followers exist to show, so none are shown.
            </p>
          </CatalogSection>

          <CatalogSection title="Preview">
            <p className="mb-1">
              A rough idea of how a creator&apos;s originals will look once this
              ships — these are mockups, not real listings.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MarketplaceComingSoonCard />
              <MarketplaceComingSoonCard />
            </div>
          </CatalogSection>
        </>
      )}

      <CatalogSection title="In the meantime">
        <p>
          The free catalogue — browsing, search, and download — never
          requires holding $MIX or connecting a wallet, and that stays true
          whether or not you have anything original to sell.{" "}
          {!marketplaceEnabled && <ComingSoonBadge />}
        </p>
      </CatalogSection>

      <PageColophon tagline="Humans browse without charge. Machines are billed. Machines do not mind." />
    </main>
  );
}
