import { ImageOff } from "lucide-react";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

// Preview/mockup only — there is no real creator-marketplace data yet
// (R06, planned). Never wired to a real asset; the dimmed thumbnail is a
// generic placeholder, not a real listing, per the "no claim without
// receipt" rule this redesign is built around.
export function MarketplaceComingSoonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-white/50 bg-[rgba(255,255,255,0.88)] p-4 shadow-soft backdrop-blur-[18px]">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] border border-line bg-bg text-dim/40 opacity-60 blur-[1px]">
        <ImageOff size={32} strokeWidth={1.5} />
      </div>

      <ComingSoonBadge label="Coming soon" />

      <p className="text-sm text-dim">Creator originals · settle in $MIX</p>

      <button
        disabled
        className="coming-soon-disabled flex items-center justify-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-dim"
      >
        buy — coming soon
      </button>
    </div>
  );
}
