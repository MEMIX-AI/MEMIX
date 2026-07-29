import Link from "next/link";
import Image from "next/image";
import type { Asset, Tag } from "@prisma/client";
import { Play, Eye, Download as DownloadIcon, ImageOff } from "lucide-react";
import { assetActionLabel, assetTypeLabel } from "@/lib/format";
import { VerdictBadge } from "@/components/VerdictBadge";
import { ShareMenu } from "@/components/ShareMenu";

type AssetWithTags = Asset & { tags: Tag[] };

export function AssetCard({ asset }: { asset: AssetWithTags }) {
  const ActionIcon = asset.type === "IMAGE" ? Eye : Play;

  return (
    <div className="card-lift flex flex-col gap-3 rounded-[22px] border border-white/50 bg-[rgba(255,255,255,0.88)] p-4 shadow-soft backdrop-blur-[18px]">
      <Link href={`/asset/${asset.id}`} className="group flex flex-col gap-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-line bg-bg shadow-soft">
          <div className="absolute left-2 top-2 z-10">
            <VerdictBadge status={asset.verdictStatus} peaked={asset.peaked} />
          </div>

          {asset.thumbnailUrl ? (
            <Image
              src={asset.thumbnailUrl}
              alt={asset.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              loading="lazy"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dim/50">
              <ImageOff size={28} strokeWidth={1.5} />
            </div>
          )}

          <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <ActionIcon size={11} strokeWidth={2} />
            {assetActionLabel(asset.type)}
          </span>
        </div>

        <p className="truncate font-heading font-semibold text-text">{asset.title}</p>

        {asset.worksWhen && (
          <p className="line-clamp-1 text-xs leading-relaxed text-dim">
            <span className="font-medium text-text/80">works when:</span> {asset.worksWhen}
          </p>
        )}
      </Link>

      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-dim">
        <span>{assetTypeLabel(asset.type)}</span>
        <span className="flex items-center gap-1 normal-case tracking-normal text-dim">
          <DownloadIcon size={12} strokeWidth={1.75} />
          {asset.downloadCount}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`/api/assets/${asset.id}/download`}
          className="gradient-brand flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:shadow-glow"
        >
          <DownloadIcon size={15} strokeWidth={1.75} />
          download
        </a>
        <ShareMenu assetId={asset.id} title={asset.title} />
      </div>
    </div>
  );
}
