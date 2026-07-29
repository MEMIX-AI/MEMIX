import Link from "next/link";
import type { Asset, Tag } from "@prisma/client";
import { BookOpen } from "lucide-react";
import {
  getFreshAssets,
  getLibrarianPicks,
  getPopularByType,
  getTrendingAssets,
} from "@/lib/assets";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { AssetCard } from "@/components/AssetCard";
import { TerminalHeroDemo } from "@/components/TerminalHeroDemo";
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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="mb-6 flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-dim shadow-soft w-fit">
        <span className="h-2 w-2 rounded-full bg-ok" />
        Live meme catalogue · free downloads
      </div>

      <h1 className="text-balance mb-4 max-w-2xl font-heading text-3xl font-bold leading-tight text-text sm:text-4xl">
        Every meme comes with a verdict.
      </h1>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-dim">
        Other meme APIs return a file. Memix returns a judgment — what&apos;s
        live, what&apos;s dated, what&apos;s dead. Free to browse and
        download.
      </p>

      <div className="mb-16 flex flex-wrap items-center gap-3">
        <Link
          href="/library"
          className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
        >
          Browse Library
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2 rounded-full border border-line bg-panel px-6 py-3 text-sm font-semibold text-text shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
        >
          <BookOpen size={15} strokeWidth={1.75} />
          Read the Docs
        </Link>
      </div>

      <div className="mb-16">
        <FeatureStrip />
      </div>

      <TerminalHeroDemo />

      <section className="mb-16 mt-16">
        <SectionHeading label="trending" />
        <AssetGrid assets={trending} />
      </section>

      <section className="mb-16">
        <SectionHeading label="fresh uploads" />
        <AssetGrid assets={fresh} />
      </section>

      <section className="mb-16">
        <SectionHeading label="librarian picks" badge="Beta" />
        {picks.length === 0 ? (
          <p className="text-sm text-dim">nothing verdicted yet.</p>
        ) : (
          <AssetGrid assets={picks} />
        )}
      </section>

      <section className="mb-16">
        <SectionHeading label="popular sounds" />
        {sounds.length === 0 ? (
          <p className="text-sm text-dim">nothing here yet.</p>
        ) : (
          <AssetGrid assets={sounds} />
        )}
      </section>

      <section className="mb-16">
        <SectionHeading label="popular videos" />
        {videos.length === 0 ? (
          <p className="text-sm text-dim">nothing here yet.</p>
        ) : (
          <AssetGrid assets={videos} />
        )}
      </section>

      <section>
        <SectionHeading label="top creators" badge="Soon" />
        <div className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          The creator directory isn&apos;t live yet — no profiles, earnings,
          or follower counts exist to show.{" "}
          <Link href="/creators" className="font-medium text-accent hover:underline">
            Read more
          </Link>
          .
        </div>
      </section>
    </main>
  );
}

function SectionHeading({ label, badge }: { label: string; badge?: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="gradient-brand h-2 w-2 rounded-full" />
      <h2 className="font-heading text-lg font-bold text-text">{label}</h2>
      {badge && <ComingSoonBadge label={badge} />}
    </div>
  );
}

function AssetGrid({ assets }: { assets: (Asset & { tags: Tag[] })[] }) {
  if (assets.length === 0) {
    return <p className="text-sm text-dim">nothing here yet.</p>;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
