"use client";

import { downloadCountStore } from "@/lib/asset-stats-store";

export function DownloadSpecValue({ assetId, initialCount }: { assetId: string; initialCount: number }) {
  const count = downloadCountStore.useValue(assetId, initialCount);
  return <>{count}</>;
}
