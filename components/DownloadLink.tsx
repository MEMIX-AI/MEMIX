"use client";

import { bumpDownloadCount } from "@/lib/asset-stats-store";

// Real native download link (a plain <a>, no fetch/blob trick) so the
// browser's normal download handling stays intact — onClick just also
// bumps the shared client-side count so every card/detail-page instance
// of this asset reflects the new download instantly. The actual
// downloadCount increment is server-side and atomic (see
// app/api/assets/[id]/download/route.ts) — this is a display-only
// optimism layer on top of that real write.
export function DownloadLink({
  assetId,
  className,
  children,
}: {
  assetId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`/api/assets/${assetId}/download`}
      onClick={() => bumpDownloadCount(assetId)}
      className={className}
    >
      {children}
    </a>
  );
}
