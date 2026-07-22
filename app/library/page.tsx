import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAssetType, searchAssets } from "@/lib/search";
import { AssetCard } from "@/components/AssetCard";
import { SearchCommandInput } from "@/components/SearchCommandInput";

const TYPE_FILTERS = [
  { value: undefined, label: "all" },
  { value: "IMAGE", label: "images" },
  { value: "VIDEO", label: "videos" },
  { value: "SOUND", label: "sounds" },
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

  const [{ assets, total, totalPages }, tags] = await Promise.all([
    searchAssets({ q, type, tag, page }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

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
    <main className="flex-1 px-6 py-8">
      <p className="mb-4 text-accent">▍ library</p>

      <form action="/library" method="GET" className="mb-6 max-w-lg">
        {type && <input type="hidden" name="type" value={type} />}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <SearchCommandInput defaultValue={q} />
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {TYPE_FILTERS.map((f) => (
          <Link
            key={f.label}
            href={hrefWith({ type: f.value })}
            className={`rounded border px-3 py-1 ${
              type === f.value
                ? "border-accent text-accent"
                : "border-line text-dim hover:border-accent"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={
                tag === t.name
                  ? hrefWith({ tag: undefined })
                  : hrefWith({ tag: t.name })
              }
              className={`rounded border px-2 py-1 ${
                tag === t.name
                  ? "border-accent text-accent"
                  : "border-line text-dim hover:border-accent"
              }`}
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      <p className="mb-4 text-xs text-dim">
        {total} result{total === 1 ? "" : "s"}
      </p>

      {assets.length === 0 ? (
        <p className="text-sm text-dim">
          › nothing matches. try a different search or filter.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link
            href={hrefWith({ page: String(page - 1) })}
            className="rounded border border-line px-3 py-1 hover:border-accent"
          >
            ‹ prev
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
            className="rounded border border-line px-3 py-1 hover:border-accent"
          >
            next ›
          </Link>
        ) : (
          <span />
        )}
      </div>
    </main>
  );
}
