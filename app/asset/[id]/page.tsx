import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssetById } from "@/lib/assets";
import { resolveAssetUrls } from "@/lib/asset-urls";
import {
  assetTypeLabel,
  formatBytes,
  formatDuration,
  licenseBadge,
  shortenWallet,
} from "@/lib/format";
import { AssetPreview } from "@/components/AssetPreview";
import { ReportButton } from "@/components/ReportButton";
import { SpecCell } from "@/components/SpecCell";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const rawAsset = await getAssetById(params.id);
  if (!rawAsset) notFound();
  const asset = await resolveAssetUrls(rawAsset);

  const license = licenseBadge(asset.isOriginal);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <AssetPreview asset={asset} />

        <div>
          <p className="mb-1 text-xs uppercase text-dim">
            {assetTypeLabel(asset.type)}
          </p>
          <h1 className="mb-6 break-words text-xl font-bold">{asset.title}</h1>

          <a
            href={`/api/assets/${asset.id}/download`}
            className="mb-6 inline-block rounded bg-accent px-6 py-3 font-bold text-bg hover:opacity-90"
          >
            $ download
          </a>

          <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line text-sm">
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
              {asset.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/library?tag=${encodeURIComponent(tag.name)}`}
                  className="rounded border border-line px-2 py-1 text-xs text-dim hover:border-accent hover:text-text"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          <p className="mb-6 text-sm text-dim">{asset.description}</p>

          <ReportButton assetId={asset.id} />
        </div>
      </div>
    </main>
  );
}
