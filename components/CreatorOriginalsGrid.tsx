"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, ImageOff, Tag as TagIcon } from "lucide-react";
import type { AssetType } from "@prisma/client";
import { formatCompactNumber } from "@/lib/format";

export interface CreatorOriginalItem {
  assetId: string;
  title: string;
  thumbnailUrl: string | null;
  type: AssetType;
  priceMix: number;
  likeCount: number;
  viewCount: number;
  soldCount: number;
  featured: boolean;
  trendingScore: number;
  createdAt: string; // ISO — serialized from the server component
}

type Filter = "ALL" | AssetType;
type Sort = "trending" | "newest" | "most-sold" | "price";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
  { value: "SOUND", label: "Sounds" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most-sold", label: "Most Sold" },
  { value: "price", label: "Price" },
];

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Real, data-driven only — filter/sort happen client-side over the exact
// list the server already fetched (no extra API round trip for what's
// usually a small per-creator catalogue), badges are computed from real
// fields (featured is an existing admin-controlled Asset column,
// trendingScore is a real 7-day download count, NEW is a real createdAt
// check) — never a fabricated "hotness" score.
export function CreatorOriginalsGrid({ items }: { items: CreatorOriginalItem[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("trending");

  const visible = useMemo(() => {
    const filtered = filter === "ALL" ? items : items.filter((i) => i.type === filter);
    const sorted = [...filtered];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "most-sold":
        sorted.sort((a, b) => b.soldCount - a.soldCount);
        break;
      case "price":
        sorted.sort((a, b) => a.priceMix - b.priceMix);
        break;
      case "trending":
      default:
        sorted.sort((a, b) => b.trendingScore - a.trendingScore || b.likeCount - a.likeCount);
        break;
    }
    return sorted;
  }, [items, filter, sort]);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={
                filter === f.value
                  ? "gradient-brand rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white"
                  : "rounded-full border border-line bg-panel px-3.5 py-1.5 text-[13px] font-medium text-dim transition-colors hover:text-text"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-[13px] font-medium text-dim outline-none transition-colors focus:border-accent/40 focus:text-text"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort · {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item) => (
          <OriginalCard key={item.assetId} item={item} />
        ))}
      </div>
    </div>
  );
}

function OriginalCard({ item }: { item: CreatorOriginalItem }) {
  const isNew = Date.now() - new Date(item.createdAt).getTime() < NEW_WINDOW_MS;
  const isTrending = item.trendingScore > 0;

  return (
    <Link
      href={`/asset/${item.assetId}`}
      className="card-lift card-glow-border glass group relative flex flex-col overflow-hidden rounded-[22px] border border-line shadow-soft"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-bg">
        {item.thumbnailUrl ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-dim/50">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.featured && <Badge tone="violet">FEATURED</Badge>}
          {isTrending && <Badge tone="cyan">TRENDING</Badge>}
          {isNew && <Badge tone="mint">NEW</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate font-heading text-[15px] font-semibold text-text">{item.title}</p>

        <div className="flex items-center gap-3 text-xs text-dim">
          <span className="flex items-center gap-1">
            <Heart size={12} strokeWidth={1.75} />
            {formatCompactNumber(item.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} strokeWidth={1.75} />
            {formatCompactNumber(item.viewCount)}
          </span>
          {item.soldCount > 0 && (
            <span className="flex items-center gap-1">
              <TagIcon size={12} strokeWidth={1.75} />
              {item.soldCount} sold
            </span>
          )}
        </div>

        <div className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-soft">
          Buy for {item.priceMix.toLocaleString()} $MIX
        </div>
      </div>
    </Link>
  );
}

function Badge({ tone, children }: { tone: "cyan" | "mint" | "violet"; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    cyan: "bg-accent/[0.16] text-accent border-accent/30",
    mint: "bg-accent-2/[0.16] text-accent-2 border-accent-2/30",
    violet: "bg-accent-3/[0.16] text-accent-3 border-accent-3/30",
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide backdrop-blur-sm ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
