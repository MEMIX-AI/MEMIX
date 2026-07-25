"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";

export function ReportButton({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-accent"
      >
        <Flag size={13} strokeWidth={2.25} />
        report this asset
      </button>
      {open && <ReportModal assetId={assetId} onClose={() => setOpen(false)} />}
    </>
  );
}
