import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  searchAssets,
  resolveLegacyCat,
  TYPE_FILTERS,
  VERDICT_FILTERS,
  SORT_OPTIONS,
} from "@/lib/search";
import { publicAssetWhere } from "@/lib/asset-visibility";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { getActiveListingsByAssetIds } from "@/lib/marketplace";
import { tagColor } from "@/lib/tag-colors";
import { AssetCard } from "@/components/AssetCard";
import { SearchCommandInput } from "@/components/SearchCommandInput";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    cat?: string;
    type?: string;
    verdict?: string;
    sort?: string;
    tag?: string;
    page?: string;
  };
}) {
  const q = searchParams.q?.trim() || undefined;
  const tag = searchParams.tag || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // An explicit `type`/`verdict` in the URL always wins; otherwise fall
  // back to Home's legacy `cat` pill so its existing links keep working
  // (Home is out of scope for this upgrade — see lib/search.ts).
  const hasExplicitTypeOrVerdict = Boolean(searchParams.type || searchParams.verdict);
  const legacy = hasExplicitTypeOrVerdict ? {} : resolveLegacyCat(searchParams.cat);

  // Legacy `cat=gifs` mapped to plain `type: "IMAGE"` (no imageKind
  // concept existed yet) — the only CATEGORY_FILTERS entry that maps to
  // IMAGE, so it unambiguously means "gif" under the new, more accurate
  // split (confirmed: Home's "GIFs" pill should now show real .gif files
  // only, not every image).
  const activeType = searchParams.type
    ? TYPE_FILTERS.find((t) => t.key === searchParams.type)
    : legacy.type === "IMAGE"
      ? TYPE_FILTERS.find((t) => t.key === "gif")
      : legacy.type
        ? TYPE_FILTERS.find((t) => t.type === legacy.type && !t.imageKind)
        : undefined;
  const activeVerdict = searchParams.verdict
    ? VERDICT_FILTERS.find((v) => v.key === searchParams.verdict)
    : legacy.verdictStatus
      ? VERDICT_FILTERS.find((v) => v.verdictStatus === legacy.verdictStatus)
      : undefined;
  const activeSort = SORT_OPTIONS.find((s) => s.key === searchParams.sort) ?? SORT_OPTIONS[0];
  // Only surfaced when arriving via Home's peaked-year pills — Library's
  // own filter rows don't offer a peaked pill (not requested), but a
  // silently-applied filter from an inbound link would be dishonest, so
  // it shows as a small dismissible chip near the results count instead.
  const legacyPeaked = hasExplicitTypeOrVerdict ? undefined : legacy.peaked;

  const [{ assets: rawAssets, total, totalPages }, tags, libraryTotal] = await Promise.all([
    searchAssets({
      q,
      tag,
      page,
      type: activeType?.type,
      imageKind: activeType?.imageKind,
      verdictStatus: activeVerdict?.verdictStatus,
      peaked: legacyPeaked,
      sort: activeSort.key,
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.count({ where: publicAssetWhere }),
  ]);
  const [assets, listingsByAssetId] = await Promise.all([
    resolveAssetUrlsMany(rawAssets),
    getActiveListingsByAssetIds(rawAssets.map((a) => a.id)),
  ]);
  const hasActiveFilter = Boolean(q || activeType || activeVerdict || tag || legacyPeaked);

  function hrefWith(overrides: Record<string, string | undefined>): string {
    const merged: Record<string, string | undefined> = {
      q,
      type: activeType?.key,
      verdict: activeVerdict?.key,
      sort: activeSort.key === "newest" ? undefined : activeSort.key,
      tag,
      page: undefined,
      ...overrides,
    };
    const usp = new URLSearchParams();
    if (merged.q) usp.set("q", merged.q);
    if (merged.type) usp.set("type", merged.type);
    if (merged.verdict) usp.set("verdict", merged.verdict);
    if (merged.sort) usp.set("sort", merged.sort);
    if (merged.tag) usp.set("tag", merged.tag);
    if (merged.page && merged.page !== "1") usp.set("page", merged.page);
    const qs = usp.toString();
    return `/library${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-heading text-2xl font-bold text-text">library</h1>
      <p className="mb-6 text-sm text-dim">
        search and filter the whole catalogue — every template, clip, and sound, each with a real
        verdict.
      </p>

      <form action="/library" method="GET" className="mb-6 max-w-lg">
        {activeType && <input type="hidden" name="type" value={activeType.key} />}
        {activeVerdict && <input type="hidden" name="verdict" value={activeVerdict.key} />}
        {activeSort.key !== "newest" && <input type="hidden" name="sort" value={activeSort.key} />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <SearchCommandInput defaultValue={q} placeholder='Search a meme, sound, or vibe…' />
      </form>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">Type</p>
      <div className="mb-5 flex flex-wrap gap-[9px]">
        <Link
          href={hrefWith({ type: undefined })}
          className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 active:scale-95 ${
            !activeType
              ? "gradient-brand border-transparent text-white shadow-glow"
              : "border-line bg-panel text-dim hover:scale-[1.04] hover:border-accent/40 hover:text-accent"
          }`}
        >
          All Types
        </Link>
        {TYPE_FILTERS.map((f) => {
          const active = activeType?.key === f.key;
          return (
            <Link
              key={f.key}
              href={hrefWith({ type: f.key })}
              className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 active:scale-95 ${
                active
                  ? "gradient-brand border-transparent text-white shadow-glow"
                  : "border-line bg-panel text-dim hover:scale-[1.04] hover:border-accent/40 hover:text-accent"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">Verdict</p>
      <div className="mb-5 flex flex-wrap gap-[9px]">
        <Link
          href={hrefWith({ verdict: undefined })}
          className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 active:scale-95 ${
            !activeVerdict
              ? "gradient-brand border-transparent text-white shadow-glow"
              : "border-line bg-panel text-dim hover:scale-[1.04] hover:border-accent/40 hover:text-accent"
          }`}
        >
          All
        </Link>
        {VERDICT_FILTERS.map((f) => {
          const active = activeVerdict?.key === f.key;
          return (
            <Link
              key={f.key}
              href={hrefWith({ verdict: f.key })}
              className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 active:scale-95 ${
                active
                  ? "gradient-brand border-transparent text-white shadow-glow"
                  : "border-line bg-panel text-dim hover:scale-[1.04] hover:border-accent/40 hover:text-accent"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-dim">Sort</p>
      <div className="mb-5 flex flex-wrap gap-[9px]">
        {SORT_OPTIONS.map((s) => {
          const active = activeSort.key === s.key;
          return (
            <Link
              key={s.key}
              href={hrefWith({ sort: s.key === "newest" ? undefined : s.key })}
              className={`rounded-full border px-4 py-[9px] text-[13.5px] font-medium transition-all duration-150 active:scale-95 ${
                active
                  ? "gradient-brand border-transparent text-white shadow-glow"
                  : "border-line bg-panel text-dim hover:scale-[1.04] hover:border-accent/40 hover:text-accent"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {tags.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2">
          {tags.map((t) => {
            const active = tag === t.name;
            const c = tagColor(t.name);
            return (
              <Link
                key={t.id}
                href={active ? hrefWith({ tag: undefined }) : hrefWith({ tag: t.name })}
                style={
                  active
                    ? undefined
                    : { background: c.bg, color: c.text, borderColor: c.border }
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft ${
                  active ? "gradient-brand border-transparent text-white shadow-glow" : ""
                }`}
              >
                #{t.name}
              </Link>
            );
          })}
        </div>
      )}

      {legacyPeaked && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-dim">
          Filtered: peaked {legacyPeaked} ·{" "}
          <Link href={hrefWith({})} className="font-medium text-accent hover:underline">
            clear
          </Link>
        </p>
      )}

      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-dim">
        {total} result{total === 1 ? "" : "s"}
      </p>

      {assets.length === 0 ? (
        <div className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          {libraryTotal === 0 ? (
            <p>
              the library&apos;s empty so far.{" "}
              <Link href="/upload" className="font-medium text-accent hover:underline">
                be the first to upload something
              </Link>
              .
            </p>
          ) : hasActiveFilter ? (
            <p>
              nothing matches. try a different search, or{" "}
              <Link href="/library" className="font-medium text-accent hover:underline">
                clear all filters
              </Link>
              .
            </p>
          ) : (
            <p>nothing here yet.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} listing={listingsByAssetId.get(asset.id)} />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link
            href={hrefWith({ page: String(page - 1) })}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 font-medium shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
          >
            <ChevronLeft size={15} /> prev
          </Link>
        ) : (
          <span />
        )}
        <span className="text-dim">
          page {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={hrefWith({ page: String(page + 1) })}
            className="flex items-center gap-1 rounded-full border border-line bg-panel px-4 py-2 font-medium shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
          >
            next <ChevronRight size={15} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
