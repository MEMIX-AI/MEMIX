import { AssetGridSkeleton } from "@/components/AssetCardSkeleton";

// Shown instantly by Next.js (via React Suspense) the moment a nav to "/"
// starts, while the real server component below still fetches fresh data
// (staleTimes.dynamic=0 means this route never serves from client cache —
// see next.config.js). Without this file the browser just sits frozen on
// the previous page until the whole fetch chain resolves; this makes that
// same wait feel instant instead.
export default function HomeLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-full bg-panel-solid" />
        <div className="text-balance mb-[22px] flex flex-col items-center gap-3">
          <div className="h-12 w-full max-w-[560px] animate-pulse rounded-xl bg-panel-solid" />
          <div className="h-12 w-2/3 animate-pulse rounded-xl bg-panel-solid" />
        </div>
        <div className="mb-8 h-5 w-full max-w-[500px] animate-pulse rounded bg-panel-solid" />
        <div className="mb-11 flex gap-3">
          <div className="h-[50px] w-40 animate-pulse rounded-[13px] bg-panel-solid" />
          <div className="h-[50px] w-40 animate-pulse rounded-[13px] bg-panel-solid" />
        </div>
        <div className="mb-[22px] h-[58px] w-full max-w-[640px] animate-pulse rounded-full bg-panel-solid" />
      </div>

      <section className="mt-16">
        <div className="mb-[26px] h-8 w-40 animate-pulse rounded bg-panel-solid" />
        <AssetGridSkeleton count={8} />
      </section>
    </main>
  );
}
