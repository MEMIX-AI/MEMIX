"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Asset } from "@prisma/client";
import { Trash2, AlertCircle, UploadCloud } from "lucide-react";
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

type OwnAsset = Pick<Asset, "id" | "title" | "type" | "status" | "visibility">;

export function MyUploadCard({ asset }: { asset: OwnAsset }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
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

  const isDeleted = asset.status === "TAKEN_DOWN";
  const isDraft = asset.status === "DRAFT";
  // A DRAFT's /asset/:id page 404s for everyone, including its own owner
  // (see prisma/schema.prisma) — same reason TAKEN_DOWN isn't linked.
  const linkable = !isDeleted && !isDraft;

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
    </div>
  );
}
