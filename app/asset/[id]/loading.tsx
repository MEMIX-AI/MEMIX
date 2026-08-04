// See app/loading.tsx for why this exists. The asset detail page's own
// data chain (session check + asset lookup + signed URL minting) is the
// slowest of the three dynamic routes — this is the one where an instant
// skeleton matters most.
export default function AssetDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="h-[50vh] max-h-[480px] w-full animate-pulse rounded-[24px] border border-line bg-panel-solid" />

        <div>
          <div className="mb-1.5 h-3.5 w-16 animate-pulse rounded bg-panel-solid" />
          <div className="mb-6 h-8 w-4/5 animate-pulse rounded bg-panel-solid" />

          <div className="mb-6 flex items-center gap-2">
            <div className="h-[46px] w-40 animate-pulse rounded-full bg-panel-solid" />
            <div className="h-[46px] w-[46px] animate-pulse rounded-full bg-panel-solid" />
          </div>

          <div className="mb-6 h-5 w-32 animate-pulse rounded bg-panel-solid" />

          <div className="mb-6 h-40 w-full animate-pulse rounded-2xl border border-line bg-panel-solid" />

          <div className="mb-6 h-28 w-full animate-pulse rounded-2xl border border-line bg-panel-solid" />

          <div className="mb-6 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-panel-solid" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-panel-solid" />
          </div>

          <div className="h-16 w-full animate-pulse rounded bg-panel-solid" />
        </div>
      </div>
    </main>
  );
}
