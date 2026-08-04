import { AssetGridSkeleton } from "@/components/AssetCardSkeleton";

// See app/loading.tsx for why this exists — same "no client cache on this
// route, so give instant feedback instead" reasoning applies here too.
export default function LibraryLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-5 h-8 w-32 animate-pulse rounded bg-panel-solid" />
      <div className="mb-6 h-[52px] w-full max-w-lg animate-pulse rounded-[20px] bg-panel-solid" />
      <div className="mb-5 flex flex-wrap gap-[9px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-panel-solid" />
        ))}
      </div>
      <AssetGridSkeleton count={12} />
    </main>
  );
}
