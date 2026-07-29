import type { VerdictStatus } from "@prisma/client";
import { verdictColor, verdictLabel } from "@/lib/verdict";

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
  const color = verdictColor(status);
  const label = verdictLabel(status);
  const isLg = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide backdrop-blur-sm ${
        isLg ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[10px]"
      }`}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}18`,
      }}
    >
      <span
        className={isLg ? "h-2 w-2 rounded-full" : "h-1.5 w-1.5 rounded-full"}
        style={{ backgroundColor: color }}
      />
      {label}
      {peaked && <span className="font-normal normal-case opacity-80">· peaked {peaked}</span>}
    </span>
  );
}
