import Link from "next/link";
import { ImageIcon, Film, Music2, LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isAssetType, searchAssets } from "@/lib/search";
import { publicAssetWhere } from "@/lib/asset-visibility";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { tagColor } from "@/lib/tag-colors";
import { AssetCard } from "@/components/AssetCard";
import { SearchCommandInput } from "@/components/SearchCommandInput";

const TYPE_FILTERS = [
  { value: undefined, label: "all", icon: LayoutGrid },
  { value: "IMAGE", label: "images", icon: ImageIcon },
  { value: "VIDEO", label: "videos", icon: Film },
  { value: "SOUND", label: "sounds", icon: Music2 },
] as const;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; tag?: string; page?: string };
}) {
  const q = searchParams.q?.trim() || undefined;
  const type = isAssetType(searchParams.type) ? searchParams.type : undefined;
  const tag = searchParams.tag || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const [{ assets: rawAssets, total, totalPages }, tags, libraryTotal] = await Promise.all([
    searchAssets({ q, type, tag, page }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.asset.count({ where: publicAssetWhere }),
  ]);
  const assets = await resolveAssetUrlsMany(rawAssets);
  const hasActiveFilter = Boolean(q || type || tag);

  function hrefWith(overrides: Record<string, string | undefined>): string {
    const merged: Record<string, string | undefined> = {
      q,
      type,
      tag,
      page: undefined,
      ...overrides,
    };
    const usp = new URLSearchParams();
    if (merged.q) usp.set("q", merged.q);
    if (merged.type) usp.set("type", merged.type);
    if (merged.tag) usp.set("tag", merged.tag);
    if (merged.page && merged.page !== "1") usp.set("page", merged.page);
    const qs = usp.toString();
    return `/library${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">library</h1>

      <form action="/library" method="GET" className="mb-6 max-w-lg">
        {type && <input type="hidden" name="type" value={type} />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <SearchCommandInput defaultValue={q} />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = type === f.value;
          return (
            <Link
              key={f.label}
              href={hrefWith({ type: f.value })}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "gradient-brand text-white shadow-glow"
                  : "border border-line bg-white text-dim shadow-soft hover:border-accent/40 hover:text-text"
              }`}
            >
              <Icon size={14} strokeWidth={2.25} />
              {f.label}
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

      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-dim">
        {total} result{total === 1 ? "" : "s"}
      </p>

      {assets.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-6 py-10 text-center text-sm text-dim shadow-soft">
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
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link
            href={hrefWith({ page: String(page - 1) })}
            className="flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 font-medium shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
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
            className="flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 font-medium shadow-soft transition-all duration-200 hover:border-accent/40 hover:shadow-soft-lg"
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
