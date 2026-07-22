export function SpecCell({
  label,
  value,
  span2,
}: {
  label: string;
  value: string;
  /** Fills the full row instead of leaving a blank grid cell behind it —
   * needed whenever the cell count in the parent 2-col grid is odd (e.g.
   * an asset with no `duration`). */
  span2?: boolean;
}) {
  return (
    <div className={`bg-panel px-3 py-2 ${span2 ? "col-span-2" : ""}`}>
      <p className="mb-1 text-[10px] uppercase text-dim">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
