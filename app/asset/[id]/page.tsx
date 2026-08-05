import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getAssetById } from "@/lib/assets";
import { getShareAsset } from "@/lib/asset-share";
import { resolveAssetUrls } from "@/lib/asset-urls";
import { getCurrentUser } from "@/lib/auth";
import {
  assetTypeLabel,
  formatBytes,
  formatDuration,
  licenseBadge,
  shortenWallet,
} from "@/lib/format";
import { verdictLabel, verdictStyle } from "@/lib/verdict";
import { tagColor } from "@/lib/tag-colors";
import { AssetPreview } from "@/components/AssetPreview";
import { ReportButton } from "@/components/ReportButton";
import { ShareMenu } from "@/components/ShareMenu";
import { SpecCell } from "@/components/SpecCell";
import { VerdictBadge } from "@/components/VerdictBadge";
import { LikeButton } from "@/components/LikeButton";
import { ViewTracker } from "@/components/ViewTracker";
import { DownloadLink } from "@/components/DownloadLink";
import { DownloadSpecValue } from "@/components/DownloadSpecValue";

// Link-preview metadata (X/Discord/Telegram/etc) — always the PUBLIC/
// UNLISTED view via getShareAsset, same as opengraph-image.tsx, never
// viewer-scoped (crawlers have no session, and a share card must look the
// same to everyone). og:image itself isn't set here — the sibling
// opengraph-image.tsx file convention wires that in automatically, at its
// own stable, always-fetchable-without-login URL.
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const asset = await getShareAsset(params.id);
  if (!asset) {
    return { title: "asset not found — memix" };
  }

  const vibe = asset.tags[0]?.name ?? assetTypeLabel(asset.type);
  const verdict = verdictLabel(asset.verdictStatus);
  const description = `Vibe: ${vibe} · ${verdict.charAt(0).toUpperCase() + verdict.slice(1)}`;
  const url = `https://memixmeme.xyz/asset/${asset.id}`;

  return {
    title: `${asset.title} — memix`,
    description,
    openGraph: {
      title: asset.title,
      description,
      url,
      siteName: "memix",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: asset.title,
      description,
    },
  };
}

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // getCurrentUser() (session cookie verify + a User lookup) and
  // getAssetById() were previously run strictly sequentially even though
  // they don't actually depend on each other for the vast majority of
  // assets — PUBLIC/UNLISTED visibility never looks at the viewer wallet
  // at all (see assetAccessWhere). So: fetch the asset as PUBLIC/UNLISTED
  // and resolve the viewer session in parallel; only PRIVATE assets ever
  // need a second, viewer-scoped query, and only after we know who's
  // asking. This turns the common case from 3 serial round trips into 2
  // parallel ones + 1 (URL signing, which genuinely needs the asset
  // first). getShareAsset (React cache()) means this is the same
  // underlying query generateMetadata already ran for this request — not
  // a second round trip.
  const [publicAsset, viewer] = await Promise.all([
    getShareAsset(params.id),
    getCurrentUser(),
  ]);
  const rawAsset =
    publicAsset ?? (viewer ? await getAssetById(params.id, viewer.walletAddress) : null);
  if (!rawAsset) notFound();
  const asset = await resolveAssetUrls(rawAsset);

  const license = licenseBadge(asset.isOriginal);
  const vStyle = verdictStyle(asset.verdictStatus);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <AssetPreview asset={asset} />

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-dim">
            {assetTypeLabel(asset.type)}
          </p>
          <h1 className="mb-6 break-words font-heading text-2xl font-bold text-text">
            {asset.title}
          </h1>

          <div className="mb-6 flex items-center gap-2">
            <DownloadLink
              assetId={asset.id}
              className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
            >
              <Download size={17} strokeWidth={1.75} />
              download
            </DownloadLink>
            <ShareMenu assetId={asset.id} title={asset.title} />
          </div>

          <div className="mb-6 flex items-center gap-4 text-sm text-dim">
            <LikeButton assetId={asset.id} initialCount={asset.likeCount} size="lg" />
            <ViewTracker assetId={asset.id} initialCount={asset.viewCount} label="views" />
          </div>

          {/* The verdict — the judgment this asset carries, deliberately
              the most visually prominent block on the page. */}
          <div
            className="mb-6 rounded-2xl border-2 bg-panel p-5 shadow-soft-lg"
            style={{ borderColor: vStyle.dot + "55" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-dim">
                the verdict
              </span>
              <VerdictBadge status={asset.verdictStatus} peaked={asset.peaked} size="lg" />
            </div>
            <div className="flex flex-col gap-3.5 text-sm">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dim">
                  works when
                </p>
                <p className="leading-relaxed text-text">
                  {asset.worksWhen ?? "not judged yet."}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dim">
                  avoid when
                </p>
                <p className="leading-relaxed text-text">
                  {asset.avoidWhen ?? "not judged yet."}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2.5 rounded-2xl border border-line bg-panel p-3 shadow-soft text-sm">
            <SpecCell label="type" value={assetTypeLabel(asset.type)} />
            <SpecCell label="size" value={formatBytes(asset.fileSize)} />
            {asset.duration != null && (
              <SpecCell label="duration" value={formatDuration(asset.duration)} />
            )}
            <SpecCell label="license" value={license.label} />
            <SpecCell
              label="uploader"
              value={
                asset.uploaderWallet
                  ? shortenWallet(asset.uploaderWallet)
                  : "anonymous"
              }
            />
            <SpecCell
              label="downloads"
              value={<DownloadSpecValue assetId={asset.id} initialCount={asset.downloadCount} />}
              span2={asset.duration == null}
            />
          </div>

          {asset.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {asset.tags.map((tag) => {
                const c = tagColor(tag.name);
                return (
                  <Link
                    key={tag.id}
                    href={`/library?tag=${encodeURIComponent(tag.name)}`}
                    style={{ background: c.bg, color: c.text, borderColor: c.border }}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    #{tag.name}
                  </Link>
                );
              })}
            </div>
          )}

          <p className="mb-6 text-sm leading-relaxed text-dim">{asset.description}</p>

          <ReportButton assetId={asset.id} />
        </div>
      </div>
    </main>
  );
}
