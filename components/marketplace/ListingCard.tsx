import Image from "next/image";
import Link from "next/link";
import { ImageOff, Tag as TagIcon } from "lucide-react";
import { shortenWallet } from "@/lib/format";

// Real listing card — one MarketplaceListing + its Asset, never a
// mockup. Not currently wired into any page (app/creators/page.tsx is
// now the creator directory/leaderboard, not a flat listing grid); kept
// for the per-creator "Originals for sale" section a future /u/[wallet]
// redesign will need.
export function ListingCard({
  assetId,
  title,
  thumbnailUrl,
  priceMix,
  sellerWallet,
}: {
  assetId: string;
  title: string;
  thumbnailUrl: string | null;
  priceMix: number;
  sellerWallet: string;
}) {
  return (
    <Link
      href={`/asset/${assetId}`}
      className="card-lift glass flex flex-col gap-3 rounded-[22px] border border-line p-4 shadow-soft"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[18px] border border-line bg-bg">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dim/50">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <p className="truncate font-heading text-base font-semibold text-text">{title}</p>
      <p className="text-xs text-dim">by {shortenWallet(sellerWallet)}</p>

      <div className="gradient-brand flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-soft">
        <TagIcon size={14} strokeWidth={1.75} />
        {priceMix.toLocaleString()} $MIX
      </div>
    </Link>
  );
}
