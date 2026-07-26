import Link from "next/link";
import Image from "next/image";
import type { Asset, Tag } from "@prisma/client";
import { Play, Eye, Download, ImageOff } from "lucide-react";
import { assetActionLabel, assetTypeLabel, licenseBadge } from "@/lib/format";

type AssetWithTags = Asset & { tags: Tag[] };

export function AssetCard({ asset }: { asset: AssetWithTags }) {
  const license = licenseBadge(asset.isOriginal);
  const ActionIcon = asset.type === "IMAGE" ? Eye : Play;

  return (
    <Link
      href={`/asset/${asset.id}`}
      className="card-lift group flex flex-col gap-3 rounded-[24px] border border-white/50 bg-white/65 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-[18px]"
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-dim">
        <span>{assetTypeLabel(asset.type)}</span>
        <span className="flex items-center gap-1 text-accent opacity-0 transition-opacity duration-250 group-hover:opacity-100">
          <ActionIcon size={11} strokeWidth={2} />
          {assetActionLabel(asset.type)}
        </span>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-line bg-bg shadow-soft">
        {asset.thumbnailUrl ? (
          <Image
            src={asset.thumbnailUrl}
            alt={asset.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dim/50">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <p className="truncate font-heading font-semibold text-text">{asset.title}</p>

      <div className="flex items-center justify-between">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            license.variant === "ok"
              ? "border-ok/30 bg-ok/10 text-ok"
              : "border-line bg-bg text-dim"
          }`}
        >
          {license.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-dim">
          <Download size={12} strokeWidth={1.75} />
          {asset.downloadCount}
        </span>
      </div>
    </Link>
  );
}
