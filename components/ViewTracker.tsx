"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

// "1 view per asset per browser per 24h rolling" — localStorage is the fast
// path (skip the network call entirely on a repeat visit within 24h), the
// server's AssetViewer table (per-IP, see app/api/assets/[id]/view/route.ts)
// is the actual source of truth. Fires once on mount so the +1 still feels
// instant, matching the previous synchronous-on-page-load behavior.
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
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const key = `mv_viewed:${assetId}`;
    const last = Number(localStorage.getItem(key) ?? 0);
    if (Date.now() - last < DEDUPE_WINDOW_MS) return;

    fetch(`/api/assets/${assetId}/view`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        localStorage.setItem(key, String(Date.now()));
        if (data?.counted) setCount((c) => c + 1);
      })
      .catch(() => undefined);
  }, [assetId]);

  return (
    <span className="flex items-center gap-1.5">
      <Eye size={15} strokeWidth={1.75} />
      {count}
      {label ? ` ${label}` : ""}
    </span>
  );
}
