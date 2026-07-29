"use client";

import { Eye } from "lucide-react";
import { viewCountStore } from "@/lib/asset-stats-store";

// Cards never trigger a view themselves (only opening the detail page
// does — see ViewTracker) — this just displays whatever the shared count
// currently is, so it stays in sync if the same asset's ViewTracker
// happens to bump it elsewhere on the same page.
export function ViewCountDisplay({ assetId, initialCount }: { assetId: string; initialCount: number }) {
  const count = viewCountStore.useValue(assetId, initialCount);
  return (
    <span className="flex items-center gap-1.5">
      <Eye size={13} strokeWidth={1.75} />
      {count}
    </span>
  );
}
