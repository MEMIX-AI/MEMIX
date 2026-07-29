"use client";

import { Download as DownloadIcon } from "lucide-react";
import { downloadCountStore } from "@/lib/asset-stats-store";

export function DownloadCount({ assetId, initialCount }: { assetId: string; initialCount: number }) {
  const count = downloadCountStore.useValue(assetId, initialCount);
  return (
    <span className="flex items-center gap-1.5">
      <DownloadIcon size={13} strokeWidth={1.75} />
      {count}
    </span>
  );
}
