import { AlertCircle } from "lucide-react";
import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "takedown — memix",
  description: "Removal requests are honoured without argument.",
};

export default function TakedownPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="draft — not yet in force"
        title="Removal requests are honoured without argument."
        lede="If you hold rights to something catalogued here and want it removed, this is the process. It's short on purpose."
      />

      <CatalogSection number="MV—D01" title="Who can request removal">
        <p>
          A rights holder, or someone authorized to act on their behalf. No
          formal legal filing is required — a good-faith request with
          accurate details is enough.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—D02" title="What to include">
        <ol className="flex flex-col gap-2">
          <li>1. The URL or entry ID.</li>
          <li>2. A short statement of your relationship to the work (creator, rights holder, or authorized agent).</li>
          <li>3. A contact for follow-up.</li>
        </ol>
        <Callout>
          You don&apos;t need to provide proof of ownership upfront — MEMIX
          acts first. Follow-up only happens if a request looks abusive.
        </Callout>
      </CatalogSection>

      <CatalogSection number="MV—D03" title="What happens next">
        <p>
          File access is revoked — not just delisted from search, actually
          unreachable. The request and the action taken are recorded in an
          append-only log that can&apos;t be edited or deleted.
        </p>
        <Callout tone="positive">
          Every download request re-checks the asset&apos;s live status
          against the database, rather than serving from a static public
          path — so a takedown genuinely cuts access on the next request,
          not just cosmetically.
        </Callout>
      </CatalogSection>

      <CatalogSection number="MV—D04" title="Disputes &amp; re-upload">
        <p>
          An uploader can dispute a takedown with evidence of their own
          rights. MEMIX reviews it and may reinstate the entry — that
          decision is logged too. Repeated bad-faith takedown or re-upload
          requests can result in account restrictions.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—D05" title="Where to send a request">
        <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3.5 text-warn shadow-soft">
          <AlertCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium leading-relaxed">
            Not filled in yet: the actual submission channel (form, email,
            or in-app report button) and expected response time. Required
            before this page goes live.
          </p>
        </div>
      </CatalogSection>

      <PageColophon />
    </main>
  );
}
