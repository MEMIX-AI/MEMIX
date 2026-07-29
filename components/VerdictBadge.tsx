import type { VerdictStatus } from "@prisma/client";
import { verdictStyle, verdictLabel } from "@/lib/verdict";

// Always rendered — an unverdicted asset still gets a badge, it just
// honestly says "unverdicted" in neutral gray instead of a status color.
export function VerdictBadge({
  status,
  peaked,
  size = "sm",
}: {
  status: VerdictStatus | null;
  peaked?: string | null;
  size?: "sm" | "lg";
}) {
  const { dot, bg, text } = verdictStyle(status);
  const label = verdictLabel(status);
  const isLg = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-[7px] rounded-full font-semibold uppercase tracking-wide ${
        isLg ? "px-3.5 py-2 text-sm" : "px-[11px] py-[5px] text-[12.5px]"
      }`}
      style={{ color: text, backgroundColor: bg }}
    >
      <span
        className={isLg ? "h-2 w-2 rounded-full" : "h-[7px] w-[7px] rounded-full"}
        style={{ backgroundColor: dot }}
      />
      {label}
      {peaked && <span className="font-normal normal-case opacity-90">· peaked {peaked}</span>}
    </span>
  );
}
