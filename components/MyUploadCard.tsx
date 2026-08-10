"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Asset } from "@prisma/client";
import { Trash2, AlertCircle, UploadCloud, Tag as TagIcon, X } from "lucide-react";
import { assetTypeLabel } from "@/lib/format";

const STATUS_STYLE: Record<Asset["status"], string> = {
  ACTIVE: "border-ok/30 bg-ok/10 text-ok",
  TAKEN_DOWN: "border-line bg-bg text-dim",
  PENDING_REVIEW: "border-accent/30 bg-accent/10 text-accent",
  DRAFT: "border-line bg-bg text-dim",
};

const VISIBILITY_LABEL: Record<Asset["visibility"], string> = {
  PUBLIC: "public",
  UNLISTED: "unlisted",
  PRIVATE: "private",
};

type OwnAsset = Pick<Asset, "id" | "title" | "type" | "status" | "visibility" | "isOriginal"> & {
  marketplaceListing?: { priceMix: number; active: boolean } | null;
};

export function MyUploadCard({
  asset,
  marketplaceEnabled,
}: {
  asset: OwnAsset;
  marketplaceEnabled: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [listing, setListing] = useState(asset.marketplaceListing ?? null);
  const [priceInput, setPriceInput] = useState(String(asset.marketplaceListing?.priceMix ?? ""));
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [listingBusy, setListingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "delete failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "delete failed");
      setDeleting(false);
      setConfirming(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${asset.id}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "publish failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "publish failed");
      setPublishing(false);
    }
  }

  async function handleList() {
    const priceMix = Number(priceInput);
    if (!Number.isFinite(priceMix) || priceMix <= 0) {
      setError("enter a real price in $MIX");
      return;
    }
    setListingBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${asset.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceMix }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "listing failed");
      setListing(data.listing);
      setShowPriceForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "listing failed");
    } finally {
      setListingBusy(false);
    }
  }

  async function handleUnlist() {
    setListingBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${asset.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "unlisting failed");
      setListing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unlisting failed");
    } finally {
      setListingBusy(false);
    }
  }

  const isDeleted = asset.status === "TAKEN_DOWN";
  const isDraft = asset.status === "DRAFT";
  // A DRAFT's /asset/:id page 404s for everyone, including its own owner
  // (see prisma/schema.prisma) — same reason TAKEN_DOWN isn't linked.
  const linkable = !isDeleted && !isDraft;
  // Same eligibility the server enforces (app/api/marketplace/listings/
  // [assetId]/route.ts) — checked here too so the control doesn't even
  // render for an asset that would just get rejected.
  const canList = marketplaceEnabled && asset.isOriginal && asset.status === "ACTIVE" && asset.visibility === "PUBLIC";

  return (
    <div className="rounded-2xl border border-line bg-panel p-4 shadow-soft transition-shadow duration-250 hover:shadow-soft-lg">
      <div className="mb-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-dim">
        <span className="flex items-center gap-1.5">
          {assetTypeLabel(asset.type)}
          {asset.visibility !== "PUBLIC" && (
            <span className="rounded-full border border-line bg-bg px-2 py-0.5 normal-case text-dim">
              {VISIBILITY_LABEL[asset.visibility]}
            </span>
          )}
        </span>
        <span className={`rounded-full border px-2 py-0.5 ${STATUS_STYLE[asset.status]}`}>
          {asset.status.replace("_", " ").toLowerCase()}
        </span>
      </div>

      {linkable ? (
        <Link href={`/asset/${asset.id}`} className="truncate font-semibold text-text transition-colors hover:text-accent">
          {asset.title}
        </Link>
      ) : (
        <p className="truncate font-semibold text-dim">{asset.title}</p>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warn">
          <AlertCircle size={12} strokeWidth={1.75} />
          {error}
        </p>
      )}

      {!isDeleted && (
        <div className="mt-3 flex items-center gap-4">
          {isDraft && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-2 disabled:opacity-50"
            >
              <UploadCloud size={12} strokeWidth={1.75} />
              {publishing ? "publishing..." : "publish"}
            </button>
          )}

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-warn"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              delete
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-dim">delete permanently?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-warn px-2.5 py-1 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "deleting..." : "confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="font-medium text-dim hover:text-text"
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!isDeleted && listing?.active && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-accent">
            <TagIcon size={12} strokeWidth={1.75} />
            for sale — {listing.priceMix.toLocaleString()} $MIX
          </span>
          <button
            onClick={handleUnlist}
            disabled={listingBusy}
            className="font-medium text-dim transition-colors hover:text-warn disabled:opacity-50"
          >
            unlist
          </button>
        </div>
      )}

      {!isDeleted && !listing?.active && canList && (
        <div className="mt-3">
          {!showPriceForm ? (
            <button
              onClick={() => setShowPriceForm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-2"
            >
              <TagIcon size={12} strokeWidth={1.75} />
              sell for $MIX
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="price in $MIX"
                className="w-28 rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent/50"
              />
              <button
                onClick={handleList}
                disabled={listingBusy}
                className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {listingBusy ? "listing..." : "list it"}
              </button>
              <button
                onClick={() => setShowPriceForm(false)}
                disabled={listingBusy}
                className="text-dim hover:text-text"
                aria-label="cancel"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
