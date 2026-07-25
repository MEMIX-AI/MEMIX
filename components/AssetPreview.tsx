import Image from "next/image";
import type { Asset } from "@prisma/client";
import { AudioPlayer } from "./AudioPlayer";

type PreviewAsset = Pick<
  Asset,
  "id" | "type" | "fileUrl" | "thumbnailUrl" | "title"
>;

export function AssetPreview({ asset }: { asset: PreviewAsset }) {
  if (asset.type === "IMAGE") {
    return (
      <div className="relative h-[50vh] max-h-[480px] w-full overflow-hidden rounded-[24px] border border-line bg-white shadow-soft">
        <Image
          src={asset.fileUrl}
          alt={asset.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
        />
      </div>
    );
  }

  if (asset.type === "VIDEO") {
    return (
      <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-soft">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={asset.fileUrl}
          controls
          playsInline
          preload="metadata"
          poster={asset.thumbnailUrl ?? undefined}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <AudioPlayer assetId={asset.id} src={asset.fileUrl} title={asset.title} />
  );
}
