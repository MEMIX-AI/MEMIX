import Link from "next/link";
import { notFound } from "next/navigation";
import {
  X as XIcon,
  MessageCircle,
  Globe,
  UploadCloud,
  Sparkles,
  ShoppingBag,
  Wallet as WalletIcon,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  Music2,
  Heart,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getProfile,
  getProfileAssets,
  getCreatorStats,
  getCreatorCategoryBreakdown,
  getCreatorDailyAnalytics,
  getPurchasedAssets,
  getLikedAssets,
  type DailyMetricSeries,
} from "@/lib/profile";
import { AnalyticsSparkline } from "@/components/AnalyticsSparkline";
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

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://memixmeme.xyz";

type Tab = "all" | "forsale" | "owned" | "liked";

// Same relabeling already established by lib/search.ts's CATEGORY_FILTERS
// (and reused on app/creators/page.tsx's "Explore by Category") — the
// schema only has IMAGE/VIDEO/SOUND, "GIFs" is IMAGE's real-world name,
// not a fabricated 4th category.
const CATEGORY_META: Record<"IMAGE" | "VIDEO" | "SOUND", { label: string; icon: React.ReactNode }> = {
  IMAGE: { label: "GIFs", icon: <ImageIcon size={13} strokeWidth={2} /> },
  VIDEO: { label: "Videos", icon: <VideoIcon size={13} strokeWidth={2} /> },
  SOUND: { label: "Sounds", icon: <Music2 size={13} strokeWidth={2} /> },
};

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: { wallet: string };
  searchParams: { tab?: string };
}) {
  if (!WALLET_RE.test(params.wallet)) notFound();
  const wallet = params.wallet.toLowerCase();
  const marketplaceOn = isMarketplaceEnabled();
  const activeTab: Tab =
    marketplaceOn && searchParams.tab === "forsale"
      ? "forsale"
      : marketplaceOn && searchParams.tab === "owned"
        ? "owned"
        : searchParams.tab === "liked"
          ? "liked"
          : "all";

  const [viewer, profile, stats, categories, analytics, rawLikedAssets, rawAssets] = await Promise.all([
    getCurrentUser(),
    getProfile(wallet),
    getCreatorStats(wallet),
    getCreatorCategoryBreakdown(wallet),
    getCreatorDailyAnalytics(wallet),
    getLikedAssets(wallet),
    getProfileAssets(wallet),
  ]);
  const likedAssets = await resolveAssetUrlsMany(rawLikedAssets);
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
  let ownedAssets: Awaited<ReturnType<typeof getPurchasedAssets>> = [];

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

    // "Owned" tab — everything this wallet has bought, as buyer (separate
    // from recentlySold above, which is this wallet's sales as seller).
    ownedAssets = await resolveAssetUrlsMany(await getPurchasedAssets(wallet));
  }

  const freeAssets = assets.filter((a) => !listedAssetIds.has(a.id));

  const displayName = profile?.username || shortenWallet(wallet);
  const avatarUrl = profile?.avatarUrl
    ? isStorageKey(profile.avatarUrl)
      ? await storage.getUrl(profile.avatarUrl).catch(() => null)
      : profile.avatarUrl
    : null;
  const initial = (profile?.username || wallet.slice(2)).charAt(0).toUpperCase();
  const profileUrl = `${SITE_URL}/u/${wallet}`;

  function tabHref(tab: Tab) {
    return tab === "all" ? `/u/${wallet}` : `/u/${wallet}?tab=${tab}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-dim">
        <Link href="/creators" className="hover:text-accent">Creators</Link>
        <ChevronRight size={13} strokeWidth={2} />
        <span className="truncate text-text">{displayName}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
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
                {profile?.handle && <p className="text-sm text-dim">@{profile.handle}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[13.5px]">
                  <CopyAddressButton address={wallet} />
                  {profile?.xHandle && (
                    <a
                      href={`https://x.com/${profile.xHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-dim hover:text-accent"
                    >
                      <XIcon size={13} strokeWidth={2.25} />
                      X (Twitter)
                    </a>
                  )}
                  {profile?.discordHandle && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-dim">
                      <MessageCircle size={13} strokeWidth={1.75} />
                      Discord
                    </span>
                  )}
                  {profile?.websiteUrl && (
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-dim hover:text-accent"
                    >
                      <Globe size={13} strokeWidth={1.75} />
                      Website
                    </a>
                  )}
                  {profile?.createdAt && (
                    <span className="text-dim">{formatJoinDate(profile.createdAt)}</span>
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
                      handle: profile?.handle ?? null,
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
                Every number starts honestly at 0 until real activity exists
                — never padded. */}
            <div className="relative mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              <StatBox value={stats.works} label="Assets" />
              <StatBox value={stats.downloads} label="Downloads" />
              <StatBox value={stats.views} label="Views" />
              <StatBox value={stats.likes} label="Likes" />
              <StatBox value={stats.followers} label="Followers" />
              <StatBox value={stats.earnedMix} label="Earnings" accent />
            </div>
          </div>

          {/* Total earned — read-only. Non-custodial by design (see
              lib/marketplace.ts): every sale already pays the creator's
              wallet directly, in the same transaction the buyer signs, so
              there's no platform-held balance and nothing to withdraw. This
              just surfaces the real, already-confirmed total — no fake
              trend % (that's Creator Analytics, a later stage). */}
          {isOwner && marketplaceOn && stats.sales > 0 && (
            <div className="glass relative mt-6 overflow-hidden rounded-[24px] border border-line p-6 shadow-soft-lg sm:p-7">
              <div
                className="absolute inset-x-0 top-0 h-16 opacity-60"
                style={{ background: "linear-gradient(120deg, var(--accent-3), var(--accent))" }}
              />
              <div className="relative flex items-center gap-2 text-sm font-semibold text-text">
                <WalletIcon size={16} strokeWidth={1.75} className="text-accent" />
                Total Earned
              </div>
              <p className="relative mt-4 font-heading text-3xl font-bold text-accent-2">
                {formatCompactNumber(stats.earnedMix)} <span className="text-lg text-dim">$MIX</span>
              </p>
              <p className="relative mt-2 text-[13px] text-dim">
                from {stats.sales} confirmed sale{stats.sales === 1 ? "" : "s"} — paid straight to your wallet
                the moment each one confirmed. No separate withdraw step: memix never holds your $MIX.
              </p>
            </div>
          )}

          {/* Tabs — "All Assets" and "Liked" are always available; "For
              Sale"/"Owned" only exist as concepts once the marketplace flag
              is on (nothing can be for-sale or owned otherwise). */}
          <div className="mt-8 flex gap-6 overflow-x-auto border-b border-line text-sm font-semibold">
            <TabLink tab="all" activeTab={activeTab} tabHref={tabHref}>All Assets</TabLink>
            {marketplaceOn && (
              <TabLink tab="forsale" activeTab={activeTab} tabHref={tabHref}>For Sale</TabLink>
            )}
            {marketplaceOn && (
              <TabLink tab="owned" activeTab={activeTab} tabHref={tabHref}>Owned</TabLink>
            )}
            <TabLink tab="liked" activeTab={activeTab} tabHref={tabHref}>Liked</TabLink>
          </div>

          {activeTab === "forsale" ? (
            <div className="mt-8">
              {originals.length > 0 ? (
                <CreatorOriginalsGrid items={originals} />
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
                  <Sparkles size={22} strokeWidth={1.5} className="mx-auto mb-3 text-accent" />
                  <p className="font-heading font-semibold text-text">Nothing listed for sale yet.</p>
                  {isOwner && (
                    <>
                      <p className="mt-1.5 text-sm text-dim">
                        List one of your original uploads and start selling it on memix.
                      </p>
                      <Link
                        href="/my-uploads"
                        className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
                      >
                        <UploadCloud size={15} strokeWidth={1.75} />
                        Manage listings
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "owned" ? (
            <div className="mt-8">
              {ownedAssets.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {ownedAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
                  <ShoppingBag size={22} strokeWidth={1.5} className="mx-auto mb-3 text-accent" />
                  <p className="font-heading font-semibold text-text">Nothing owned yet.</p>
                  {isOwner && (
                    <>
                      <p className="mt-1.5 text-sm text-dim">
                        Things you buy on memix show up here.
                      </p>
                      <Link
                        href="/library"
                        className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
                      >
                        Browse the library
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "liked" ? (
            <div className="mt-8">
              {likedAssets.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {likedAssets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
                  <Heart size={22} strokeWidth={1.5} className="mx-auto mb-3 text-accent" />
                  <p className="font-heading font-semibold text-text">Nothing liked yet.</p>
                  {isOwner && (
                    <>
                      <p className="mt-1.5 text-sm text-dim">
                        Only likes made while signed in show up here — anonymous likes
                        made before this existed can&apos;t retroactively appear.
                      </p>
                      <Link
                        href="/library"
                        className="gradient-brand mt-4 inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-250 hover:shadow-glow"
                      >
                        Browse the library
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Creator Originals — marketplace listings only */}
              {marketplaceOn && originals.length > 0 && (
                <div className="mt-8">
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
                <div className="mt-8 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-11 text-center shadow-soft">
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
                <div className="mt-8">
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
              <div className="mt-8">
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
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {freeAssets.map((asset) => (
                      <AssetCard key={asset.id} asset={asset} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sell CTA — only for the creator's own free uploads, and only
              when there's something real to point at (an isOriginal asset
              they haven't listed yet); otherwise this would just repeat the
              empty-state CTA above for no reason. */}
          {isOwner && marketplaceOn && freeAssets.some((a) => a.isOriginal) && (
            <div className="mt-8 glass relative overflow-hidden rounded-[24px] border border-line p-8 text-center shadow-soft-lg">
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
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-[22px] border border-line bg-panel p-6 shadow-soft">
            <h2 className="mb-4 font-heading text-base font-bold text-text">About Creator</h2>
            {profile?.bio ? (
              <p className="mb-4 text-sm leading-relaxed text-dim">{profile.bio}</p>
            ) : (
              isOwner && (
                <p className="mb-4 text-sm leading-relaxed text-faint">
                  No bio yet — add one from Edit profile.
                </p>
              )
            )}
            <div className="flex flex-col gap-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-faint">Joined</span>
                <span className="font-medium text-text">
                  {profile?.createdAt ? formatJoinDate(profile.createdAt).replace(/^Joined /, "") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Wallet</span>
                <CopyAddressButton address={wallet} />
              </div>
            </div>
          </div>

          {/* Public — unlike "Total Earned" above, every visitor sees this,
              not just the owner. analytics itself is already fetched
              unconditionally regardless of viewer, so this is purely a
              render-gate change. */}
          <div className="rounded-[22px] border border-line bg-panel p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-text">Creator Analytics</h2>
              <span className="text-[11px] text-faint">Last 30 days</span>
            </div>
            <div className="flex flex-col gap-5">
              <AnalyticsRow label="Views" color="var(--accent)" series={analytics.views} formatValue={formatCompactNumber} />
              <AnalyticsRow label="Downloads" color="var(--accent-3)" series={analytics.downloads} formatValue={formatCompactNumber} />
              {marketplaceOn && (
                <AnalyticsRow
                  label="Earnings"
                  color="var(--accent-2)"
                  series={analytics.earnings}
                  formatValue={(v) => `${formatCompactNumber(v)} $MIX`}
                />
              )}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="rounded-[22px] border border-line bg-panel p-6 shadow-soft">
              <h2 className="mb-4 font-heading text-base font-bold text-text">Top Categories</h2>
              <div className="flex flex-col gap-3.5">
                {categories.map((c) => (
                  <div key={c.type}>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="inline-flex items-center gap-1.5 font-medium text-text">
                        {CATEGORY_META[c.type].icon}
                        {CATEGORY_META[c.type].label}
                      </span>
                      <span className="text-faint">{c.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                      <div className="gradient-brand h-full rounded-full" style={{ width: `${c.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function TabLink({
  tab,
  activeTab,
  tabHref,
  children,
}: {
  tab: Tab;
  activeTab: Tab;
  tabHref: (tab: Tab) => string;
  children: React.ReactNode;
}) {
  const active = activeTab === tab;
  return (
    <Link
      href={tabHref(tab)}
      className={`-mb-px shrink-0 border-b-2 px-1 pb-3 transition-colors ${
        active ? "border-accent text-text" : "border-transparent text-dim hover:text-text"
      }`}
    >
      {children}
    </Link>
  );
}

function StatBox({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-bg/60 px-2.5 py-2.5 text-center">
      <p className={`font-heading text-lg font-bold ${accent ? "text-accent-2" : "text-text"}`}>
        {formatCompactNumber(value)}
      </p>
      <p className="text-[10.5px] text-dim">{label}</p>
    </div>
  );
}

// One Creator Analytics row — real daily history from
// lib/profile.ts#getCreatorDailyAnalytics, never padded/extrapolated. A
// metric with zero real events ever gets a plain honest line instead of a
// chart; a metric with real data covering less than the full 30-day window
// is captioned with exactly how many days are real and, if fewer than 30,
// since when — never implies a full 30-day view when it isn't one.
function AnalyticsRow({
  label,
  color,
  series,
  formatValue,
}: {
  label: string;
  color: string;
  series: DailyMetricSeries;
  formatValue: (value: number) => string;
}) {
  if (series.points.length === 0) {
    return (
      <div>
        <p className="mb-1 text-[13px] font-medium text-text">{label}</p>
        <p className="text-[11px] text-faint">Not enough {label.toLowerCase()} data yet.</p>
      </div>
    );
  }

  const daysCovered = series.points.length;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-text">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="font-heading text-base font-bold text-text">{formatValue(series.total)}</span>
          {series.changePercent != null && (
            <span className={`text-[11px] font-semibold ${series.changePercent >= 0 ? "text-ok" : "text-warn"}`}>
              {series.changePercent >= 0 ? "+" : ""}
              {series.changePercent}%
            </span>
          )}
        </div>
      </div>
      <AnalyticsSparkline points={series.points} color={color} formatValue={formatValue} />
      <p className="mt-1 text-[10.5px] text-faint">
        last {daysCovered} day{daysCovered === 1 ? "" : "s"}
        {daysCovered < 30 ? ` · data since ${series.earliestDate}` : ""}
      </p>
    </div>
  );
}
