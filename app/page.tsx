import type { Asset, Tag } from "@prisma/client";
import { getFeaturedAssets, getFreshAssets, getTrendingAssets } from "@/lib/assets";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { AssetCard } from "@/components/AssetCard";
import { TerminalHeroDemo } from "@/components/TerminalHeroDemo";

// Trending/fresh must reflect live DB state on every request, not get
// frozen at `next build` time as a static page.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredRaw, trendingRaw, freshRaw] = await Promise.all([
    getFeaturedAssets(8),
    getTrendingAssets(8),
    getFreshAssets(8),
  ]);
  const [featured, trending, fresh] = await Promise.all([
    resolveAssetUrlsMany(featuredRaw),
    resolveAssetUrlsMany(trendingRaw),
    resolveAssetUrlsMany(freshRaw),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center gap-2 text-xs text-dim">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        library is live · free for humans
      </div>

      <TerminalHeroDemo />

      <p className="mb-16 mt-6 max-w-xl text-sm text-dim">
        memevault is a free meme library — images, video, sound — searchable
        and downloadable by anyone. no login, no wallet, no paywall.
        <br />
        <span className="font-bold text-text">free for humans.</span>{" "}
        <span className="text-dim">paid for agents, coming later.</span>
      </p>

      {featured.length > 0 && (
        <section className="mb-16">
          <p className="mb-4 text-accent">▍ featured</p>
          <AssetGrid assets={featured} />
        </section>
      )}

      <section className="mb-16">
        <p className="mb-4 text-accent">▍ trending</p>
        <AssetGrid assets={trending} />
      </section>

      <section>
        <p className="mb-4 text-accent">▍ fresh uploads</p>
        <AssetGrid assets={fresh} />
      </section>
    </main>
  );
}

function AssetGrid({ assets }: { assets: (Asset & { tags: Tag[] })[] }) {
  if (assets.length === 0) {
    return <p className="text-sm text-dim">› nothing here yet.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {assets.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}
