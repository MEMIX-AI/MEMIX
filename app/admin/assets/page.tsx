import Image from "next/image";
import Link from "next/link";
import type { AssetStatus } from "@prisma/client";
import { ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { assetTypeLabel, shortenWallet } from "@/lib/format";
import { resolveAssetUrlsMany } from "@/lib/asset-urls";
import { ReasonActionButton } from "@/components/admin/ReasonActionButton";
import { FeatureToggleButton } from "@/components/admin/FeatureToggleButton";

const STATUS_FILTERS: { value?: AssetStatus; label: string }[] = [
  { value: undefined, label: "all" },
  { value: "ACTIVE", label: "active" },
  { value: "TAKEN_DOWN", label: "taken down" },
  { value: "PENDING_REVIEW", label: "pending" },
];

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = STATUS_FILTERS.find((f) => f.value === searchParams.status)
    ?.value;

  const rawAssets = await prisma.asset.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const assets = await resolveAssetUrlsMany(rawAssets);

  return (
    <div>
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">asset management</h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/admin/assets?status=${f.value}` : "/admin/assets"}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-250 ${
              status === f.value
                ? "gradient-brand text-white shadow-glow"
                : "border border-line bg-panel text-dim shadow-soft hover:border-accent/40"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {assets.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          no assets match this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-4 shadow-soft"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line bg-bg">
                {asset.thumbnailUrl ? (
                  <Image
                    src={asset.thumbnailUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-dim/50">
                    <ImageOff size={14} strokeWidth={1.75} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/asset/${asset.id}`}
                  target="_blank"
                  className="block truncate font-heading font-semibold text-text hover:text-accent"
                >
                  {asset.title}
                </Link>
                <p className="text-xs font-medium uppercase tracking-wide text-dim">
                  {assetTypeLabel(asset.type)} ·{" "}
                  {asset.status.toLowerCase().replace("_", " ")}
                  {asset.uploaderWallet && (
                    <> · {shortenWallet(asset.uploaderWallet)}</>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <FeatureToggleButton assetId={asset.id} featured={asset.featured} />
                {asset.status === "ACTIVE" && (
                  <ReasonActionButton
                    label="takedown"
                    modalTitle="takedown asset"
                    url={`/api/admin/assets/${asset.id}/takedown`}
                    variant="accent"
                    confirmLabel="takedown"
                  />
                )}
                {asset.status === "TAKEN_DOWN" && (
                  <ReasonActionButton
                    label="restore"
                    modalTitle="restore asset"
                    url={`/api/admin/assets/${asset.id}/restore`}
                    confirmLabel="restore"
                  />
                )}
                <ReasonActionButton
                  label="delete permanently"
                  modalTitle="delete asset permanently"
                  url={`/api/admin/assets/${asset.id}/delete`}
                  confirmLabel="delete forever"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
