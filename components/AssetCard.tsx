import Link from "next/link";
import Image from "next/image";
import type { Asset, Tag } from "@prisma/client";
import { assetActionLabel, assetTypeLabel, licenseBadge } from "@/lib/format";

type AssetWithTags = Asset & { tags: Tag[] };

export function AssetCard({ asset }: { asset: AssetWithTags }) {
  const license = licenseBadge(asset.isOriginal);

  return (
    <Link
      href={`/asset/${asset.id}`}
      className="group flex flex-col gap-2 rounded border border-line bg-panel p-3 transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex items-center justify-between text-[10px] uppercase text-dim">
        <span>{assetTypeLabel(asset.type)}</span>
        <span className="group-hover:text-accent">
          ▸ {assetActionLabel(asset.type)}
        </span>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded border border-line bg-bg">
        {asset.thumbnailUrl ? (
          <Image
            src={asset.thumbnailUrl}
            alt={asset.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dim">
            ▸
          </div>
        )}
      </div>

      <p className="truncate font-bold">{asset.title}</p>

      <span
        className={`self-start rounded border px-1.5 py-0.5 text-[10px] uppercase ${
          license.variant === "ok"
            ? "border-ok text-ok"
            : "border-line text-dim"
        }`}
      >
        {license.label}
      </span>

      <p className="text-xs text-dim">{asset.downloadCount} downloads</p>
    </Link>
  );
}
