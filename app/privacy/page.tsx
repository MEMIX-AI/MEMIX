import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "privacy — memix",
  description: "What MEMIX keeps, and why.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="draft — not yet in force"
        title="What MEMIX keeps, and why."
        lede="A plain account of what data is collected from browsers, uploaders, and API users, and what it's used for."
      >
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-dim">
          Last updated: draft — insert date on publish · this is a starting
          draft, not legal advice. Have counsel review before you rely on it.
        </p>
      </CatalogHero>

      <CatalogSection title="Browsing the library">
        <p>
          Searching and downloading from the public library doesn&apos;t
          require an account. No name, email, or personal identifier is
          collected from a browser. Standard technical logs (IP address,
          timestamp) are kept briefly for rate-limiting and abuse
          prevention — not profiling.
        </p>
        <p className="text-xs text-dim">
          IP addresses are hashed before storage, never kept in plain form.
        </p>
      </CatalogSection>

      <CatalogSection title="Wallet connection">
        <p>
          Connecting a wallet uses SIWE (Sign-In with Ethereum). MEMIX
          stores the public wallet address used to sign in — nothing more.
          No private key, seed phrase, or balance is ever collected. Signing
          in never triggers a payment or an on-chain transaction.
        </p>
      </CatalogSection>

      <CatalogSection title="Uploads &amp; ownership declarations">
        <p>
          The ownership/authorization declaration made at upload time
          (including the uploading wallet address, a timestamp, and a hashed
          IP) is stored permanently as a legal record — even if the asset
          itself is later removed.
        </p>
      </CatalogSection>

      <CatalogSection title="API keys &amp; usage">
        <p>
          An API key is tied to the wallet address that generated it. Call
          volume and which endpoints are used are logged for billing and
          rate-limiting. Query contents are retained only as long as needed
          for abuse detection, then discarded.
        </p>
      </CatalogSection>

      <CatalogSection title="Takedown records">
        <p>
          Every takedown request and its resolution is recorded permanently
          in an append-only log. See{" "}
          <Link href="/takedown" className="font-medium text-accent underline">
            /takedown
          </Link>
          .
        </p>
      </CatalogSection>

      <CatalogSection title="What is never sold">
        <Callout>
          MEMIX never sells wallet addresses, upload history, or query
          logs to third parties.
        </Callout>
        <p>What is sold is access to the structured catalogue data, via the API.</p>
      </CatalogSection>

      <CatalogSection title="Contact &amp; jurisdiction">
        <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3.5 text-warn shadow-soft">
          <AlertCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium leading-relaxed">
            Not filled in yet: a data controller contact address and
            applicable jurisdiction. Both are required before this page goes
            live.
          </p>
        </div>
      </CatalogSection>

      <PageColophon />
    </main>
  );
}
