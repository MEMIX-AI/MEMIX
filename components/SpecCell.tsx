export function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-3 py-2">
      <p className="mb-1 text-[10px] uppercase text-dim">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
