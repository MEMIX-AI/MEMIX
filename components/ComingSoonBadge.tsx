export function ComingSoonBadge({ label = "Soon" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        color: "var(--coming-soon)",
        borderColor: "rgba(139,149,160,0.35)",
        backgroundColor: "rgba(139,149,160,0.12)",
      }}
    >
      {label}
    </span>
  );
}
