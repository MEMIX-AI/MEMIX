"use client";

import { useEffect } from "react";
import { Eye } from "lucide-react";
import { viewCountStore } from "@/lib/asset-stats-store";

// "1 view per asset per browser per 24h rolling" — localStorage is the fast
// path (skip the network call entirely on a repeat visit within 24h), the
// server's AssetViewer table (per-IP, see app/api/assets/[id]/view/route.ts)
// is the actual source of truth. Fires once on mount so the +1 still feels
// instant, matching the previous synchronous-on-page-load behavior. Reads
// through the shared viewCountStore (see lib/asset-stats-store.ts) so any
// other instance of this same asset already on the page stays in sync too.
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function ViewTracker({
  assetId,
  initialCount,
  label,
}: {
  assetId: string;
  initialCount: number;
  label?: string;
}) {
  const count = viewCountStore.useValue(assetId, initialCount);

  useEffect(() => {
    const key = `mv_viewed:${assetId}`;
    const last = Number(localStorage.getItem(key) ?? 0);
    if (Date.now() - last < DEDUPE_WINDOW_MS) return;

    fetch(`/api/assets/${assetId}/view`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        localStorage.setItem(key, String(Date.now()));
        if (data?.counted) {
          const current = viewCountStore.get(assetId) ?? initialCount;
          viewCountStore.set(assetId, current + 1);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  return (
    <span className="flex items-center gap-1.5">
      <Eye size={15} strokeWidth={1.75} />
      {count}
      {label ? ` ${label}` : ""}
    </span>
  );
}
