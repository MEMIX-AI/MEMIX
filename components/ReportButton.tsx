"use client";

import { useState } from "react";
import { ReportModal } from "./ReportModal";

export function ReportButton({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-dim underline hover:text-text"
      >
        report this asset
      </button>
      {open && <ReportModal assetId={assetId} onClose={() => setOpen(false)} />}
    </>
  );
}
