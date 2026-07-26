import type { ReactNode } from "react";

// Shared building blocks for the "library catalogue" style pages (/docs,
// /roadmap, /terms) — same visual language as the rest of the site (teal
// tokens, glass/soft-shadow panels, gradient-brand), just laid out as a
// numbered shelf of entries instead of an asset grid.

export function CatalogHero({
  status,
  title,
  lede,
  children,
}: {
  status: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-14">
      <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-dim shadow-soft">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        {status}
      </div>
      <h1 className="text-balance mb-4 font-heading text-3xl font-bold leading-tight text-text sm:text-4xl">
        {title}
      </h1>
      {lede && <p className="max-w-2xl text-base leading-relaxed text-dim">{lede}</p>}
      {children}
    </div>
  );
}

export function CatalogSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-heading text-lg font-bold text-text">{title}</h2>
      <div className="flex flex-col gap-3.5 text-sm leading-relaxed text-dim">{children}</div>
    </section>
  );
}

const CALLOUT_TONES: Record<"neutral" | "positive", string> = {
  neutral: "border-line bg-panel text-text",
  positive: "border-ok/30 bg-ok/10 text-ok",
};

export function Callout({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive";
  children: ReactNode;
}) {
  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-soft ${CALLOUT_TONES[tone]}`}>
      {children}
    </p>
  );
}

export function PageColophon({ tagline }: { tagline?: string }) {
  return (
    <div className="mt-16 border-t border-line pt-6 font-mono text-xs text-dim">
      <p className="font-semibold text-text">MEMIX · catalogue of record</p>
      {tagline && <p className="mt-1">{tagline}</p>}
      <p className="mt-2.5 text-dim/80">
        librarian@memix:~$<span className="cursor-blink text-accent">▊</span>
      </p>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  shipped: "border-ok/30 bg-ok/10 text-ok",
  "in progress": "border-warn/30 bg-warn/10 text-warn",
  planned: "border-line bg-panel text-dim",
};

export function StatusBadge({ status }: { status: "shipped" | "in progress" | "planned" }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
