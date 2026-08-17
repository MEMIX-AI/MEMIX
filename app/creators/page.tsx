import Link from "next/link";
import {
  Sparkles,
  Wand2,
  Coins,
  Flame,
  Crown,
  Users,
  UploadCloud,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Music2,
  Video as VideoIcon,
  Image as ImageIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { publicAssetWhere } from "@/lib/asset-visibility";
import { getCurrentUser } from "@/lib/auth";
import {
  getCreatorSummaries,
  getHubStats,
  rankTrending,
  rankTop,
  rankNewest,
  type CreatorSummary,
} from "@/lib/creators";
import { CATEGORY_FILTERS } from "@/lib/search";
import { shortenWallet, formatCompactNumber } from "@/lib/format";
import { FollowButton } from "@/components/FollowButton";
import { BecomeCreatorButton } from "@/components/BecomeCreatorButton";

export const metadata = {
  title: "creators — memix",
  description: "Creators building original work on memix, paid out in $MIX.",
};

// Layout follows the Creator Hub reference mock (hero, stats bar, why-
// become-a-creator, trending + leaderboard rail, category + new creators,
// trust strip) — but every number on it comes from lib/creators.ts's real
// aggregate queries, never the mock's placeholder figures. A brand new
// catalogue with zero creators renders honest empty states throughout,
// not a padded-out row of fake rows — see CLAUDE.md's "no claim without
// receipt".
const CATEGORY_TILE_KEYS = ["gifs", "videos", "sounds"] as const;
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  gifs: <ImageIcon size={20} strokeWidth={1.75} />,
  videos: <VideoIcon size={20} strokeWidth={1.75} />,
  sounds: <Music2 size={20} strokeWidth={1.75} />,
};

export default async function CreatorsPage() {
  const viewer = await getCurrentUser();
  const viewerProfile = viewer
    ? await prisma.user.findUnique({
        where: { walletAddress: viewer.walletAddress },
        select: { creatorOnboardedAt: true },
      })
    : null;
  const viewerIsCreator = !!viewerProfile?.creatorOnboardedAt;
  const viewerWallet = viewer?.walletAddress ?? null;

  const [creators, typeCounts] = await Promise.all([
    getCreatorSummaries(),
    prisma.asset.groupBy({ by: ["type"], where: publicAssetWhere, _count: { _all: true } }),
  ]);

  const trending = rankTrending(creators, 8);
  const top = rankTop(creators, 5);
  const newest = rankNewest(creators, 3);
  const hub = getHubStats(creators);
  const countByType = new Map(typeCounts.map((t) => [t.type, t._count._all]));

  const followingSet =
    viewer && newest.length > 0
      ? new Set(
          (
            await prisma.follow.findMany({
              where: {
                followerWallet: viewer.walletAddress,
                followingWallet: { in: newest.map((c) => c.walletAddress) },
              },
              select: { followingWallet: true },
            })
          ).map((f) => f.followingWallet),
        )
      : new Set<string>();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      {/* HERO — left: pitch + CTA. right: real stats + why-become-a-creator. */}
      <div className="mb-20 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <div className="glass mb-6 flex w-fit items-center gap-2 rounded-full border border-line px-[15px] py-[7px] text-[13px] font-semibold text-accent shadow-soft">
            <span
              className="h-[7px] w-[7px] rounded-full bg-ok"
              style={{ boxShadow: "0 0 0 4px rgba(109,243,196,.18)" }}
            />
            memix creator hub
          </div>

          <h1 className="text-balance mb-[22px] font-heading text-[clamp(38px,5vw,58px)] font-bold leading-[1.02] tracking-[-0.035em] text-text">
            Create. Share. <span className="gradient-spectrum">Earn with Memix.</span>
          </h1>
          <p className="mb-8 max-w-[520px] text-lg leading-[1.55] text-dim">
            Turn original memes, sounds, and clips into real work — discovered
            through the catalogue, collected by whoever wants them, settled
            in $MIX.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <BecomeCreatorButton variant="hero" isCreator={viewerIsCreator} walletAddress={viewerWallet} />
            <a
              href="#trending"
              className="glass flex items-center gap-2 rounded-[13px] border border-line px-[26px] py-[14px] text-[15px] font-semibold text-text transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/40"
            >
              Explore Creators
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3.5">
            <StatTile
              icon={<Users size={18} strokeWidth={1.75} />}
              value={formatCompactNumber(hub.creatorCount)}
              label="Creators"
            />
            <StatTile
              icon={<UploadCloud size={18} strokeWidth={1.75} />}
              value={formatCompactNumber(hub.totalWorks)}
              label="Originals"
            />
            <StatTile
              icon={<ShoppingBag size={18} strokeWidth={1.75} />}
              value={formatCompactNumber(hub.totalSales)}
              label="Sales"
            />
            <StatTile
              icon={<Coins size={18} strokeWidth={1.75} />}
              value={formatCompactNumber(hub.totalEarnedMix)}
              label="Total $MIX Earned"
            />
          </div>

          <div className="glass rounded-[22px] border border-line p-5 shadow-soft">
            <h2 className="mb-4 font-heading text-base font-bold text-text">
              Why become a creator?
            </h2>
            <div className="flex flex-col gap-4">
              <WhyItem
                icon={<Wand2 size={17} strokeWidth={1.75} />}
                title="Upload & Own"
                body="Upload your original work and you keep full ownership."
              />
              <WhyItem
                icon={<Coins size={17} strokeWidth={1.75} />}
                title="Set Your Price"
                body="Choose your price in $MIX and sell directly to collectors."
              />
              <WhyItem
                icon={<Sparkles size={17} strokeWidth={1.75} />}
                title="Earn & Grow"
                body="Every sale pays straight to your wallet, on-chain."
              />
            </div>
          </div>
        </div>
      </div>

      {/* TRENDING CREATORS + TOP CREATORS LEADERBOARD */}
      <div className="mb-20 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section id="trending" className="min-w-0 scroll-mt-24">
          <SectionHeading
            icon={<Flame size={16} strokeWidth={2} className="text-warn" />}
            kicker="discover"
            title="Trending Creators"
            subtitle="Ranked by real sales, follows, and work — not hype."
          />
          {trending.length === 0 ? (
            <EmptyCreatorState isCreator={viewerIsCreator} walletAddress={viewerWallet} />
          ) : (
            <div className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2">
              {trending.map((creator) => (
                <div key={creator.walletAddress} className="w-[220px] shrink-0 snap-start">
                  <CreatorCard creator={creator} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-5">
          <div>
            <SectionHeading
              icon={<Crown size={16} strokeWidth={2} className="text-warn" />}
              kicker="leaderboard"
              title="Top Creators"
            />
            {top.length === 0 ? (
              <p className="glass rounded-[22px] border border-line px-5 py-8 text-center text-sm text-dim shadow-soft">
                No confirmed sales yet — the leaderboard fills in as real sales happen.
              </p>
            ) : (
              <div className="glass overflow-hidden rounded-[22px] border border-line shadow-soft">
                {top.map((creator, i) => (
                  <LeaderboardRow key={creator.walletAddress} rank={i + 1} creator={creator} />
                ))}
              </div>
            )}
          </div>

          <SidebarCta isCreator={viewerIsCreator} walletAddress={viewerWallet} />
        </section>
      </div>

      {/* EXPLORE BY CATEGORY + NEW CREATORS */}
      <div className="mb-20 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeading kicker="browse" title="Explore by Category" />
          <div className="grid grid-cols-3 gap-3.5">
            {CATEGORY_TILE_KEYS.map((key) => {
              const filter = CATEGORY_FILTERS.find((f) => f.key === key)!;
              const count = filter.type ? countByType.get(filter.type) ?? 0 : 0;
              return (
                <Link
                  key={key}
                  href={`/library?cat=${key}`}
                  className="card-lift glass flex flex-col items-center gap-2 rounded-[18px] border border-line px-3 py-5 text-center shadow-soft"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
                    {CATEGORY_ICONS[key]}
                  </div>
                  <p className="font-heading text-sm font-semibold text-text">{filter.label}</p>
                  <p className="text-[11px] text-faint">{formatCompactNumber(count)}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHeading kicker="fresh" title="New Creators" />
          {newest.length === 0 ? (
            <EmptyCreatorState compact isCreator={viewerIsCreator} walletAddress={viewerWallet} />
          ) : (
            <div className="glass flex flex-col divide-y divide-line rounded-[22px] border border-line shadow-soft">
              {newest.map((creator) => (
                <NewCreatorRow
                  key={creator.walletAddress}
                  creator={creator}
                  isSignedIn={!!viewer}
                  initialFollowing={followingSet.has(creator.walletAddress)}
                  isSelf={viewer?.walletAddress === creator.walletAddress}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* TRUST STRIP */}
      <section className="glass grid gap-6 rounded-[22px] border border-line p-7 shadow-soft sm:grid-cols-3">
        <TrustItem
          icon={<ShieldCheck size={19} strokeWidth={1.75} />}
          title="Non-Custodial"
          body="Wallet to wallet. Memix never holds your funds."
        />
        <TrustItem
          icon={<Zap size={19} strokeWidth={1.75} />}
          title="Instant Settlement"
          body="Get paid in $MIX the moment a sale confirms."
        />
        <TrustItem
          icon={<Users size={19} strokeWidth={1.75} />}
          title="Built for Creators"
          body="Keep full ownership — no rights ever signed away."
        />
      </section>
    </main>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass rounded-[18px] border border-line px-4 py-3.5 shadow-soft">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.08] text-accent">
        {icon}
      </div>
      <p className="font-heading text-lg font-bold text-text">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

function WhyItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs leading-relaxed text-dim">{body}</p>
      </div>
    </div>
  );
}

function SidebarCta({ isCreator, walletAddress }: { isCreator: boolean; walletAddress: string | null }) {
  return (
    <div className="gradient-brand relative overflow-hidden rounded-[22px] p-6 shadow-glow">
      <h3 className="mb-1.5 font-heading text-lg font-bold text-white">
        Ready to start your journey?
      </h3>
      <p className="mb-5 text-[13px] leading-relaxed text-white/85">
        Join creators earning $MIX by sharing what they love.
      </p>
      <BecomeCreatorButton variant="sidebar" isCreator={isCreator} walletAddress={walletAddress} />
    </div>
  );
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08] text-accent">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs leading-relaxed text-dim">{body}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  kicker,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-[22px]">
      <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        {"// "}
        {kicker}
      </p>
      <h2 className="flex items-center gap-2 font-heading text-[22px] font-bold tracking-tight text-text">
        {icon}
        {title}
      </h2>
      {subtitle && <p className="mt-1.5 text-sm text-dim">{subtitle}</p>}
    </div>
  );
}

function Avatar({ creator, size = 52 }: { creator: CreatorSummary; size?: number }) {
  const initial = (creator.username || creator.walletAddress.slice(2)).charAt(0).toUpperCase();
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-panel bg-gradient-to-br from-accent-2 to-accent-3"
      style={{ width: size, height: size }}
    >
      {creator.avatarUrl ? (
        // Arbitrary URL (own storage OR a pasted external link) — same
        // reasoning as app/u/[wallet]/page.tsx and WalletButton.tsx, next/
        // image's remotePatterns allowlist doesn't cover an arbitrary
        // pasted avatar link.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-heading font-bold text-white"
          style={{ fontSize: size * 0.36 }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const displayName = creator.username || shortenWallet(creator.walletAddress);
  const secondary = creator.handle ? `@${creator.handle}` : creator.username ? shortenWallet(creator.walletAddress) : null;
  return (
    <Link
      href={`/u/${creator.walletAddress}`}
      className="card-lift glass flex h-full flex-col rounded-[22px] border border-line p-5 shadow-soft"
    >
      <Avatar creator={creator} />

      <p className="mt-4 truncate font-heading text-base font-semibold text-text">{displayName}</p>
      {secondary && <p className="truncate text-xs text-dim">{secondary}</p>}

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3.5 text-sm">
        <Stat value={creator.works} label="works" />
        <Stat value={creator.followers} label="followers" />
        <Stat value={creator.sales} label="sales" />
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-heading font-semibold text-text">{formatCompactNumber(value)}</p>
      <p className="text-[10.5px] uppercase tracking-wide text-faint">{label}</p>
    </div>
  );
}

function LeaderboardRow({ rank, creator }: { rank: number; creator: CreatorSummary }) {
  const displayName = creator.username || shortenWallet(creator.walletAddress);
  return (
    <Link
      href={`/u/${creator.walletAddress}`}
      className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-accent/[0.05]"
    >
      <span className="w-5 shrink-0 font-mono text-xs text-faint">
        {String(rank).padStart(2, "0")}
      </span>
      <Avatar creator={creator} size={30} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text">{displayName}</p>
        <p className="truncate text-[11px] text-faint">
          {creator.handle ? `@${creator.handle} · ` : ""}
          {creator.sales} sales
        </p>
      </div>
      <span className="shrink-0 text-right text-[13px] font-semibold text-accent-2">
        {formatCompactNumber(creator.earnedMix)} $MIX
      </span>
    </Link>
  );
}

function NewCreatorRow({
  creator,
  isSignedIn,
  initialFollowing,
  isSelf,
}: {
  creator: CreatorSummary;
  isSignedIn: boolean;
  initialFollowing: boolean;
  isSelf: boolean;
}) {
  const displayName = creator.username || shortenWallet(creator.walletAddress);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Link href={`/u/${creator.walletAddress}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar creator={creator} size={38} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{displayName}</p>
          <p className="truncate text-[11px] text-faint">
            {creator.handle ? `@${creator.handle} · ` : ""}
            {creator.works} work{creator.works === 1 ? "" : "s"}
          </p>
        </div>
      </Link>
      {!isSelf && (
        <FollowButton
          targetWallet={creator.walletAddress}
          initialFollowing={initialFollowing}
          isSignedIn={isSignedIn}
        />
      )}
    </div>
  );
}

function EmptyCreatorState({
  compact = false,
  isCreator,
  walletAddress,
}: {
  compact?: boolean;
  isCreator: boolean;
  walletAddress: string | null;
}) {
  return (
    <div
      className={`glass flex flex-col items-center gap-4 rounded-[22px] border border-line text-center shadow-soft ${
        compact ? "px-5 py-9" : "px-6 py-14"
      }`}
    >
      <Sparkles size={compact ? 22 : 26} strokeWidth={1.5} className="text-accent" />
      <div>
        <p className="font-heading text-base font-bold text-text">Be the first creator on memix.</p>
        <p className="mt-1.5 text-sm text-dim">
          No one&apos;s listed an original yet — the shelf is empty and waiting.
        </p>
      </div>
      <BecomeCreatorButton variant="empty" isCreator={isCreator} walletAddress={walletAddress} />
    </div>
  );
}
