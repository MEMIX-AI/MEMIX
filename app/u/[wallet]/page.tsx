import Link from "next/link";
import { notFound } from "next/navigation";
import { X as XIcon, MessageCircle, Globe, UploadCloud, Sparkles, ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, getProfileAssets, getCreatorStats } from "@/lib/profile";
import { resolveAssetUrlsMany, isStorageKey } from "@/lib/asset-urls";
import { storage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { isMarketplaceEnabled } from "@/lib/marketplace";
import { shortenWallet, formatJoinDate, formatCompactNumber } from "@/lib/format";
import { AssetCard } from "@/components/AssetCard";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { ProfileEditButton } from "@/components/ProfileEditButton";
import { FollowButton } from "@/components/FollowButton";
import { ProfileShareMenu } from "@/components/ProfileShareMenu";
import { CreatorOriginalsGrid, type CreatorOriginalItem } from "@/components/CreatorOriginalsGrid";
import { EarningsCard } from "@/components/EarningsCard";

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://memixmeme.xyz";

export default async function ProfilePage({
  params,
}: {
  params: { wallet: string };
}) {
  if (!WALLET_RE.test(params.wallet)) notFound();
  const wallet = params.wallet.toLowerCase();
  const marketplaceOn = isMarketplaceEnabled();

  const [viewer, profile, stats, rawAssets] = await Promise.all([
    getCurrentUser(),
    getProfile(wallet),
    getCreatorStats(wallet),
    getProfileAssets(wallet),
  ]);
  const assets = await resolveAssetUrlsMany(rawAssets);
  const isOwner = viewer?.walletAddress === wallet;

  // No point asking "do you follow yourself" — only queried when a
  // different, signed-in wallet is viewing.
  const isFollowing =
    viewer && !isOwner
      ? !!(await prisma.follow.findUnique({
          where: { followerWallet_followingWallet: { followerWallet: viewer.walletAddress, followingWallet: wallet } },
        }))
      : false;

  // Creator Originals — real active listings by this wallet, gated the
  // same way the asset detail page's buy flow already is: while
  // MARKETPLACE_ENABLED is off, this section simply doesn't render (same
  // "byte-for-byte what it always was" default as app/asset/[id]/page.tsx),
  // and every upload — original or not — shows in the plain grid below
  // instead of a half-working "for sale" card nobody can actually buy.
  let originals: CreatorOriginalItem[] = [];
  let recentlySold: { assetId: string; title: string; thumbnailUrl: string | null; priceMix: number; soldCount: number; confirmedAt: Date }[] = [];
  let listedAssetIds = new Set<string>();

  if (marketplaceOn) {
    const listings = await prisma.marketplaceListing.findMany({
      where: { sellerWallet: wallet, active: true, asset: { status: "ACTIVE", visibility: "PUBLIC" } },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    listedAssetIds = new Set(listings.map((l) => l.assetId));

    const [soldCounts, trending] = await Promise.all([
      prisma.marketplacePurchase.groupBy({
        by: ["assetId"],
        where: { assetId: { in: listings.map((l) => l.assetId) }, status: "CONFIRMED" },
        _count: { _all: true },
      }),
      prisma.downloadEvent.groupBy({
        by: ["assetId"],
        where: { assetId: { in: listings.map((l) => l.assetId) }, createdAt: { gte: new Date(Date.now() - TRENDING_WINDOW_MS) } },
        _count: { _all: true },
      }),
    ]);
    const soldByAsset = new Map(soldCounts.map((s) => [s.assetId, s._count._all]));
    const trendingByAsset = new Map(trending.map((t) => [t.assetId, t._count._all]));

    const withThumbs = await resolveAssetUrlsMany(listings.map((l) => l.asset));
    originals = listings.map((listing, i) => ({
      assetId: listing.assetId,
      title: listing.asset.title,
      thumbnailUrl: withThumbs[i].thumbnailUrl,
      type: listing.asset.type,
      priceMix: listing.priceMix,
      likeCount: listing.asset.likeCount,
      viewCount: listing.asset.viewCount,
      soldCount: soldByAsset.get(listing.assetId) ?? 0,
      featured: listing.asset.featured,
      trendingScore: trendingByAsset.get(listing.assetId) ?? 0,
      createdAt: listing.createdAt.toISOString(),
    }));

    const recentPurchases = await prisma.marketplacePurchase.findMany({
      where: { sellerWallet: wallet, status: "CONFIRMED" },
      include: { listing: { include: { asset: true } } },
      orderBy: { confirmedAt: "desc" },
      take: 6,
    });
    const soldThumbs = await resolveAssetUrlsMany(recentPurchases.map((p) => p.listing.asset));
    recentlySold = recentPurchases.map((p, i) => ({
      assetId: p.assetId,
      title: p.listing.asset.title,
      thumbnailUrl: soldThumbs[i].thumbnailUrl,
      priceMix: p.priceMix,
      soldCount: soldByAsset.get(p.assetId) ?? 0,
      confirmedAt: p.confirmedAt!,
    }));
  }

  const freeAssets = assets.filter((a) => !listedAssetIds.has(a.id));

  const displayName = profile?.username || shortenWallet(wallet);
  const avatarUrl = profile?.avatarUrl
    ? isStorageKey(profile.avatarUrl)
      ? await storage.getUrl(profile.avatarUrl).catch(() => null)
      : profile.avatarUrl
    : null;
  const initial = (profile?.username || wallet.slice(2)).charAt(0).toUpperCase();
  const hasAbout = !!(profile?.bio || profile?.xHandle || profile?.discordHandle || profile?.websiteUrl);
  const profileUrl = `${SITE_URL}/u/${wallet}`;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-line bg-panel p-6 shadow-soft-lg sm:p-8">
        <div
          className="absolute inset-x-0 top-0 h-20"
          style={{ background: "linear-gradient(120deg, var(--accent-3), var(--accent-2), var(--blue))" }}
        />

        <div className="relative flex flex-col items-start gap-5 pt-12 sm:flex-row sm:items-end sm:pt-14">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border-4 border-panel bg-gradient-to-br from-accent-2 to-accent-3 shadow-soft-lg">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-3xl font-bold text-white">
                {initial}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-[26px] font-bold tracking-tight text-text">
              {displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <CopyAddressButton address={wallet} />
              {profile?.xHandle && (
                <a
                  href={`https://x.com/${profile.xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent hover:underline"
                >
                  <XIcon size={13} strokeWidth={2.25} />@{profile.xHandle}
                </a>
              )}
              {profile?.createdAt && (
                <span className="text-[13px] text-dim">{formatJoinDate(profile.createdAt)}</span>
              )}
            </div>
            {profile?.bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{profile.bio}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:absolute sm:right-6 sm:top-6">
            {isOwner ? (
              <ProfileEditButton
                profile={{
                  username: profile?.username ?? null,
                  avatarUrl,
                  xHandle: profile?.xHandle ?? null,
                  discordHandle: profile?.discordHandle ?? null,
                  websiteUrl: profile?.websiteUrl ?? null,
                  bio: profile?.bio ?? null,
                }}
                walletAddress={wallet}
              />
            ) : (
              <FollowButton targetWallet={wallet} initialFollowing={isFollowing} isSignedIn={!!viewer} />
            )}
            <ProfileShareMenu url={profileUrl} text={`${displayName} on memix`} />
          </div>
        </div>

        {/* Stats — real aggregates only, see lib/profile.ts#getCreatorStats.
            Followers/Sales/$MIX Earned start honestly at 0 until real
            activity exists — never padded. */}
        <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatBox value={stats.works} label="Works" />
          <StatBox value={stats.followers} label="Followers" />
          <StatBox value={stats.sales} label="Sales" />
          <StatBox value={stats.earnedMix} label="$MIX Earned" accent />
        </div>
      </div>

      {isOwner && marketplaceOn && (
        <div className="mt-8">
          <EarningsCard walletAddress={wallet} />
        </div>
      )}

      {/* Creator Originals — marketplace listings only */}
      {marketplaceOn && originals.length > 0 && (
        <div className="mt-10">
          <div className="mb-5">
            <h2 className="font-heading text-xl font-bold tracking-tight text-text">Creator Originals</h2>
            <p className="mt-1 text-sm text-dim">
              Original work from {displayName}, available to collect.
            </p>
          </div>
          <CreatorOriginalsGrid items={originals} />
        </div>
      )}

      {marketplaceOn && originals.length === 0 && isOwner && (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
          <Sparkles size={22} strokeWidth={1.5} className="mx-auto mb-3 text-accent" />
          <p className="font-heading font-semibold text-text">No originals yet.</p>
          <p className="mt-1.5 text-sm text-dim">
            Upload your first original meme and start selling it on memix.
          </p>
          <Link
            href="/upload"
            className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
          >
            <UploadCloud size={15} strokeWidth={1.75} />
            Upload Original
          </Link>
        </div>
      )}

      {/* Recently Sold — real confirmed sales, social proof */}
      {marketplaceOn && recentlySold.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-5 font-heading text-xl font-bold tracking-tight text-text">Recently Sold</h2>
          <div className="glass overflow-hidden rounded-[22px] border border-line shadow-soft">
            {recentlySold.map((sale) => (
              <div
                key={`${sale.assetId}-${sale.confirmedAt.toISOString()}`}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-line bg-bg">
                  {sale.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sale.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-dim/40">
                      <ShoppingBag size={16} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/asset/${sale.assetId}`} className="truncate text-sm font-medium text-text hover:text-accent">
                    {sale.title}
                  </Link>
                  <p className="text-xs text-dim">Sold {sale.soldCount} time{sale.soldCount === 1 ? "" : "s"}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-accent-2">{sale.priceMix.toLocaleString()} $MIX</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploads — everything else (free, or not currently listed) */}
      <div className="mt-10">
        <h2 className="mb-5 font-heading text-xl font-bold tracking-tight text-text">
          {marketplaceOn && originals.length > 0 ? "Free Uploads" : "Uploads"}
        </h2>

        {freeAssets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
            <p className="font-heading font-semibold text-text">No uploads yet</p>
            <p className="mt-1.5 text-sm text-dim">
              {isOwner
                ? "When you publish something, it shows up here."
                : "When this creator publishes something, it shows up here."}
            </p>
            {isOwner && (
              <Link
                href="/upload"
                className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
              >
                <UploadCloud size={15} strokeWidth={1.75} />
                Upload your first asset
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {freeAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>

      {/* About */}
      {hasAbout && (
        <div className="mt-10 rounded-[22px] border border-line bg-panel p-6 shadow-soft">
          <h2 className="mb-3 font-heading text-base font-bold text-text">About {displayName}</h2>
          {profile?.bio && <p className="mb-4 text-sm leading-relaxed text-dim">{profile.bio}</p>}
          <div className="flex flex-wrap gap-4 text-[13.5px]">
            {profile?.xHandle && (
              <a
                href={`https://x.com/${profile.xHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-dim hover:text-accent"
              >
                <XIcon size={14} strokeWidth={2} />@{profile.xHandle}
              </a>
            )}
            {profile?.discordHandle && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-dim">
                <MessageCircle size={14} strokeWidth={1.75} />
                {profile.discordHandle}
              </span>
            )}
            {profile?.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-dim hover:text-accent"
              >
                <Globe size={14} strokeWidth={1.75} />
                {profile.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Sell CTA — only for the creator's own free uploads, and only
          when there's something real to point at (an isOriginal asset
          they haven't listed yet); otherwise this would just repeat the
          empty-state CTA above for no reason. */}
      {isOwner && marketplaceOn && freeAssets.some((a) => a.isOriginal) && (
        <div className="mt-10 glass relative overflow-hidden rounded-[24px] border border-line p-8 text-center shadow-soft-lg">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-3))" }}
          />
          <h2 className="relative font-heading text-xl font-bold text-text">
            Have something worth sharing?
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-dim">
            Turn your original meme into a product on memix.
          </p>
          <Link
            href="/my-uploads"
            className="gradient-brand relative mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
          >
            Upload &amp; Sell
          </Link>
        </div>
      )}
    </main>
  );
}

function StatBox({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-bg/60 px-3 py-2.5 text-center">
      <p className={`font-heading text-lg font-bold ${accent ? "text-accent-2" : "text-text"}`}>
        {formatCompactNumber(value)}
      </p>
      <p className="text-[11px] text-dim">{label}</p>
    </div>
  );
}
