import Link from "next/link";
import type { Asset, Tag } from "@prisma/client";
import { Search, BookOpen, ArrowRight } from "lucide-react";
import {
  getFreshAssets,
  getLibrarianPicks,
  getPopularByType,
  getTrendingAssets,
} from "@/lib/assets";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { CATEGORY_FILTERS } from "@/lib/search";
import { getCurrentUser } from "@/lib/auth";
import { getLikedAssetIds } from "@/lib/likes";
import { AssetCard } from "@/components/AssetCard";
import { FeatureStrip } from "@/components/FeatureStrip";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

// Trending/fresh/popular must reflect live DB state on every request,
// not get frozen at `next build` time as a static page.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [trendingRaw, freshRaw, picksRaw, soundsRaw, videosRaw] = await Promise.all([
    getTrendingAssets(8),
    getFreshAssets(8),
    getLibrarianPicks(8),
    getPopularByType("SOUND", 8),
    getPopularByType("VIDEO", 8),
  ]);
  const [trending, fresh, picks, sounds, videos] = await Promise.all([
    resolveAssetUrlsMany(trendingRaw),
    resolveAssetUrlsMany(freshRaw),
    resolveAssetUrlsMany(picksRaw),
    resolveAssetUrlsMany(soundsRaw),
    resolveAssetUrlsMany(videosRaw),
  ]);

  const user = await getCurrentUser();
  const allIds = [...trending, ...fresh, ...picks, ...sounds, ...videos].map((a) => a.id);
  const likedIds = await getLikedAssetIds(user?.walletAddress, allIds);
  const signedIn = !!user;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.7)] px-[15px] py-[7px] text-[13px] font-semibold text-accent shadow-soft">
          <span
            className="h-[7px] w-[7px] rounded-full bg-ok"
            style={{ boxShadow: "0 0 0 4px rgba(60,203,127,.18)" }}
          />
          Live meme catalogue · free downloads
        </div>

        <h1 className="text-balance mb-[22px] font-heading text-[clamp(38px,6vw,66px)] font-bold leading-[1.02] tracking-[-0.035em] text-text">
          Every meme comes with a <span className="gradient-text">verdict.</span>
        </h1>
        <p className="mb-8 max-w-[560px] text-lg leading-[1.55] text-dim">
          Other meme APIs return a file. Memix returns a judgment —
          what&apos;s live, what&apos;s dated, what&apos;s dead. Free to browse
          and download.
        </p>

        <div className="mb-11 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/library"
            className="gradient-brand flex items-center gap-2 rounded-[13px] px-[26px] py-[14px] text-[15px] font-semibold text-white shadow-glow transition-transform duration-200 hover:-translate-y-0.5"
          >
            Browse Library
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 rounded-[13px] border border-line bg-[rgba(255,255,255,0.6)] px-[26px] py-[14px] text-[15px] font-semibold text-text transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/85"
          >
            <BookOpen size={16} strokeWidth={1.75} />
            Read the Docs
          </Link>
        </div>

        <form action="/library" method="GET" className="relative mb-[22px] w-full max-w-[640px]">
          <Search size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-dim" />
          <input
            name="q"
            type="text"
            placeholder="Search a meme, sound, or vibe…"
            className="w-full rounded-full border border-line bg-[rgba(255,255,255,0.8)] py-[18px] pl-[54px] pr-[22px] text-base text-text shadow-soft outline-none transition-all duration-200 focus:shadow-glow"
          />
        </form>

        <div className="flex flex-wrap justify-center gap-[9px]">
          {CATEGORY_FILTERS.map((f, i) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/library" : `/library?cat=${f.key}`}
              className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 hover:scale-[1.04] hover:border-accent/40 hover:text-accent ${
                i === 0
                  ? "gradient-brand border-transparent text-white shadow-glow"
                  : "border-line bg-[rgba(255,255,255,0.55)] text-dim"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-16">
        <SectionHeading
          emoji="🔥"
          label="Trending"
          subtitle="What the catalogue says is worth using right now."
          viewAllHref="/library"
        />
        <AssetGrid assets={trending} flag="TRENDING" likedIds={likedIds} signedIn={signedIn} />
      </section>

      <section className="mt-16">
        <SectionHeading emoji="✨" label="Fresh Uploads" subtitle="Just added to the catalogue." viewAllHref="/library" />
        <AssetGrid assets={fresh} flag="NEW" likedIds={likedIds} signedIn={signedIn} />
      </section>

      <section className="mt-16">
        <SectionHeading
          emoji="🤖"
          label="Librarian Picks"
          subtitle="Real verdicted entries, curated by what's actually been judged."
          badge="Beta"
        />
        {picks.length === 0 ? (
          <p className="text-sm text-dim">nothing verdicted yet.</p>
        ) : (
          <AssetGrid assets={picks} likedIds={likedIds} signedIn={signedIn} />
        )}
      </section>

      <section className="mt-16">
        <SectionHeading emoji="🔊" label="Popular Sounds" subtitle="Most downloaded in this format." viewAllHref="/library?cat=sounds" />
        {sounds.length === 0 ? (
          <p className="text-sm text-dim">nothing here yet.</p>
        ) : (
          <AssetGrid assets={sounds} likedIds={likedIds} signedIn={signedIn} />
        )}
      </section>

      <section className="mt-16">
        <SectionHeading emoji="🎬" label="Popular Videos" subtitle="Most downloaded in this format." viewAllHref="/library?cat=videos" />
        {videos.length === 0 ? (
          <p className="text-sm text-dim">nothing here yet.</p>
        ) : (
          <AssetGrid assets={videos} likedIds={likedIds} signedIn={signedIn} />
        )}
      </section>

      <section className="mt-16">
        <SectionHeading emoji="👥" label="Top Creators" subtitle="The creator directory — not live yet." badge="Soon" />
        <div className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          The creator directory isn&apos;t live yet — no profiles, earnings,
          or follower counts exist to show.{" "}
          <Link href="/creators" className="font-medium text-accent hover:underline">
            Read more
          </Link>
          .
        </div>
      </section>

      <div className="mt-16">
        <FeatureStrip />
      </div>
    </main>
  );
}

function SectionHeading({
  emoji,
  label,
  subtitle,
  badge,
  viewAllHref,
}: {
  emoji: string;
  label: string;
  subtitle?: string;
  badge?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="mb-[26px] flex items-end justify-between">
      <div>
        <h2 className="flex items-center gap-2.5 font-heading text-[26px] font-bold tracking-tight text-text">
          <span>{emoji}</span>
          {label}
          {badge && <ComingSoonBadge label={badge} />}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-dim">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-semibold text-accent transition-colors duration-200 hover:bg-accent/[0.08]"
        >
          View All <ArrowRight size={14} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

function AssetGrid({
  assets,
  flag,
  likedIds,
  signedIn,
}: {
  assets: (Asset & { tags: Tag[] })[];
  flag?: "TRENDING" | "NEW";
  likedIds: Set<string>;
  signedIn: boolean;
}) {
  if (assets.length === 0) {
    return <p className="text-sm text-dim">nothing here yet.</p>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          flag={flag}
          liked={likedIds.has(asset.id)}
          signedIn={signedIn}
        />
      ))}
    </div>
  );
}
