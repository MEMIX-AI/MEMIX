import Link from "next/link";
import Image from "next/image";
import type { Asset, Tag } from "@prisma/client";
import { Play, Eye, Download as DownloadIcon, ImageOff } from "lucide-react";
import { assetTypeLabel, formatDuration, formatRelativeTime, shortenWallet } from "@/lib/format";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ShareMenu } from "@/components/ShareMenu";

type AssetWithTags = Asset & { tags: Tag[] };

export function AssetCard({
  asset,
  flag,
}: {
  asset: AssetWithTags;
  /** Contextual "TRENDING"/"NEW" thumbnail flag — only ever set by a
   * parent section that's honestly showing this asset for that reason
   * (the home page's Trending/Fresh Uploads rails), never fabricated. */
  flag?: "TRENDING" | "NEW";
}) {
  const ActionIcon = asset.type === "IMAGE" ? Eye : Play;
  const kind = `${assetTypeLabel(asset.type).toUpperCase()}${
    asset.duration != null ? ` · ${formatDuration(asset.duration)}` : ""
  }`;

  return (
    <div className="card-lift flex flex-col rounded-[22px] border border-line bg-[rgba(255,255,255,0.88)] p-3.5 shadow-soft backdrop-blur-[8px]">
      <Link href={`/asset/${asset.id}`} className="group flex flex-col">
        <div className="relative mb-3.5 aspect-square w-full overflow-hidden rounded-[18px] border border-line bg-bg">
          {flag && (
            <span className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-gradient-to-br from-[#FF8A3D] to-[#FF5E5E] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">
              {flag}
            </span>
          )}

          {asset.thumbnailUrl ? (
            <Image
              src={asset.thumbnailUrl}
              alt={asset.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              loading="lazy"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dim/50">
              <ImageOff size={28} strokeWidth={1.5} />
            </div>
          )}

          <span className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-[rgba(20,50,60,0.55)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <ActionIcon size={11} strokeWidth={2} />
            {kind}
          </span>
        </div>

        <div className="mb-2.5">
          <VerdictBadge status={asset.verdictStatus} peaked={asset.peaked} />
        </div>

        <p className="mb-1.5 truncate font-heading text-base font-semibold tracking-tight text-text">
          {asset.title}
        </p>

        <div className="mb-2.5 flex items-center gap-1.5 text-[13px] text-dim">
          <span className="gradient-brand h-5 w-5 shrink-0 rounded-full" />
          {asset.uploaderWallet ? (
            <span>by {shortenWallet(asset.uploaderWallet)}</span>
          ) : (
            <span>anonymous</span>
          )}
          <span>· {formatRelativeTime(asset.createdAt)}</span>
        </div>

        {(asset.worksWhen || asset.avoidWhen) && (
          <p className="mb-3 line-clamp-1 text-[12.5px] leading-[1.4] text-dim">
            <b className="font-semibold text-text">
              {asset.worksWhen ? "Works when:" : "Avoid when:"}
            </b>{" "}
            {asset.worksWhen ?? asset.avoidWhen}
          </p>
        )}

        <div className="mb-3 flex items-center gap-3.5 border-b border-line pb-3 text-[12.5px] text-dim">
          <span className="flex items-center gap-1.5">
            <DownloadIcon size={13} strokeWidth={1.75} />
            {asset.downloadCount}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <a
          href={`/api/assets/${asset.id}/download`}
          className="gradient-brand flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-[11px] text-[13.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
        >
          <DownloadIcon size={14} strokeWidth={1.75} />
          Download
        </a>
        <ShareMenu assetId={asset.id} title={asset.title} />
      </div>
    </div>
  );
}
