// Mirrors AssetCard's exact box dimensions (rounded-[22px] card,
// rounded-[18px] aspect-square media, same padding/gaps) so swapping the
// real card in causes zero layout shift once data arrives.
export function AssetCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[22px] border border-line bg-panel-solid p-3.5 shadow-soft">
      <div className="mb-3.5 aspect-square w-full animate-pulse rounded-[18px] bg-line/40" />
      <div className="mb-2.5 h-5 w-20 animate-pulse rounded-full bg-line/40" />
      <div className="mb-1.5 h-4 w-4/5 animate-pulse rounded bg-line/40" />
      <div className="mb-2.5 h-3.5 w-1/2 animate-pulse rounded bg-line/40" />
      <div className="mb-3 mt-3 h-4 w-full animate-pulse rounded bg-line/40" />
      <div className="flex items-center gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-xl bg-line/40" />
        <div className="h-10 w-10 animate-pulse rounded-xl bg-line/40" />
      </div>
    </div>
  );
}

export function AssetGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <AssetCardSkeleton key={i} />
      ))}
    </div>
  );
}
