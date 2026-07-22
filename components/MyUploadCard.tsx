"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Asset } from "@prisma/client";
import { assetTypeLabel } from "@/lib/format";

const STATUS_STYLE: Record<Asset["status"], string> = {
  ACTIVE: "border-ok text-ok",
  TAKEN_DOWN: "border-line text-dim",
  PENDING_REVIEW: "border-accent text-accent",
};

type OwnAsset = Pick<Asset, "id" | "title" | "type" | "status">;

export function MyUploadCard({ asset }: { asset: OwnAsset }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const isDeleted = asset.status === "TAKEN_DOWN";

  return (
    <div className="rounded border border-line bg-panel p-4">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase text-dim">
        <span>{assetTypeLabel(asset.type)}</span>
        <span className={`rounded border px-1.5 py-0.5 ${STATUS_STYLE[asset.status]}`}>
          {asset.status.replace("_", " ").toLowerCase()}
        </span>
      </div>

      {isDeleted ? (
        <p className="truncate font-bold text-dim">{asset.title}</p>
      ) : (
        <Link href={`/asset/${asset.id}`} className="truncate font-bold hover:text-accent">
          {asset.title}
        </Link>
      )}

      {error && <p className="mt-2 text-xs text-dim">✕ {error}</p>}

      {!isDeleted && (
        <div className="mt-3">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-dim underline hover:text-text"
            >
              delete
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-dim">delete permanently?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded border border-accent px-2 py-0.5 text-accent hover:bg-accent hover:text-bg disabled:opacity-50"
              >
                {deleting ? "deleting..." : "confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-dim hover:text-text"
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
