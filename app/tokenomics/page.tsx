import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "tokenomics — memix",
  description: "$MIX is live — supply, distribution, and utility.",
};

const CONTRACT = "0xB9e6319feAb4284BBcB1cD361387F550cbDe16a5";

export default function TokenomicsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="$MIX is live"
        title="$MIX is live."
      />

      <CatalogSection title="Supply &amp; chain">
        <ol className="flex flex-col gap-2">
          <li>Total supply: 1,000,000,000 (fixed, no future inflation)</li>
          <li>Chain: Robinhood Chain</li>
          <li>
            Contract: <code className="font-mono text-accent">{CONTRACT}</code>
          </li>
        </ol>
      </CatalogSection>

      <CatalogSection title="Distribution">
        <p>
          No private sale. No seed round. No VC allocation. No presale.
          Distribution follows the Virtuals fair-launch mechanism.
        </p>
        <p>
          Team allocation is locked and unlocks gradually over time — not
          liquid on day one.
        </p>
      </CatalogSection>

      <CatalogSection title="Utility">
        <Callout tone="positive">
          Right now: token holders get a voice in what gets built next, and
          priority access once the creator shop opens.
        </Callout>
        <Callout>
          Planned, not live yet: creator shop transactions settled in $MIX,
          with a stablecoin option alongside it so creators aren&apos;t
          fully exposed to token volatility.
        </Callout>
      </CatalogSection>

      <CatalogSection title="Buy &amp; trade">
        <p>
          Search &quot;MEMIX Librarian&quot; or contract address{" "}
          <code className="font-mono text-accent">{CONTRACT}</code> on{" "}
          app.virtuals.io.
        </p>
      </CatalogSection>

      <p className="text-xs leading-relaxed text-dim/80">
        The catalogue and API do not require holding the token to use.
      </p>

      <PageColophon />
    </main>
  );
}
