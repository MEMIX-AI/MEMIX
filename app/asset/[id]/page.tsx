import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getAssetById } from "@/lib/assets";
import { resolveAssetUrls } from "@/lib/asset-urls";
import {
  assetTypeLabel,
  formatBytes,
  formatDuration,
  licenseBadge,
  shortenWallet,
} from "@/lib/format";
import { verdictStyle } from "@/lib/verdict";
import { tagColor } from "@/lib/tag-colors";
import { AssetPreview } from "@/components/AssetPreview";
import { ReportButton } from "@/components/ReportButton";
import { ShareMenu } from "@/components/ShareMenu";
import { SpecCell } from "@/components/SpecCell";
import { VerdictBadge } from "@/components/VerdictBadge";
import { LikeButton } from "@/components/LikeButton";
import { ViewTracker } from "@/components/ViewTracker";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const rawAsset = await getAssetById(params.id);
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
            <a
              href={`/api/assets/${asset.id}/download`}
              className="gradient-brand flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
            >
              <Download size={17} strokeWidth={1.75} />
              download
            </a>
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
              value={String(asset.downloadCount)}
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
