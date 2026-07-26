import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "terms — memevault",
  description: "The rules of the catalogue.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="draft — not yet in force"
        title="The rules of the catalogue."
        lede="Plain terms for using MEMEVAULT — as a browser, an uploader, or a machine calling the API."
      >
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-dim">
          Last updated: draft — insert date on publish · this is a starting
          draft, not legal advice. Have counsel review before you rely on it.
        </p>
      </CatalogHero>

      <CatalogSection number="MV—T01" title="What MEMEVAULT is">
        <p>
          MEMEVAULT is a catalogue and search platform for internet meme
          assets. It does not create the works in the catalogue — assets are
          uploaded by users, not MEMEVAULT.
        </p>
        <Callout>
          MEMEVAULT is a hosting and cataloguing platform, not a publisher of
          the works it indexes.
        </Callout>
      </CatalogSection>

      <CatalogSection number="MV—T02" title="What is free, and what is paid">
        <p>
          Browsing and downloading are free for anyone — no account, no
          wallet, no charge. Programmatic access (search, entry data,
          verdicts via the API) requires an API key and is billed to the
          calling application — this is access to MEMEVAULT&apos;s catalogue
          and metadata, not a sale of the underlying asset.
        </p>
        <p>
          Wallet connection is identity only — signing in, generating an API
          key, or opening a creator shop. It never triggers a payment or an
          on-chain transaction by itself.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T03" title="Uploading content">
        <p>
          An uploader must confirm ownership of, or authorization to share,
          each asset at upload time; that declaration is recorded and
          retained. Uploading grants MEMEVAULT a license to host, display,
          and catalogue the asset — the uploader retains ownership.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T04" title="Ownership">
        <p>
          MEMEVAULT claims no ownership of the works it catalogues. It
          claims its catalogue: the descriptions, verdicts, status labels,
          and structure. Rights to the underlying image, clip, or sound
          remain with the prior rights holder.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T05" title="Takedown &amp; reporting">
        <p>
          A rights holder may request removal at any time; requests are
          honoured without argument. See{" "}
          <Link href="/takedown" className="font-medium text-accent underline">
            /takedown
          </Link>
          . Every request and its resolution is logged and retained.
        </p>
        <p className="text-xs text-dim">
          Removal affects the asset and MEMEVAULT&apos;s own file access —
          cached copies outside MEMEVAULT&apos;s systems are outside its
          control.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T06" title="Prohibited content and conduct">
        <ul className="flex flex-col gap-2">
          <li>Content the uploader doesn&apos;t hold the rights to, or isn&apos;t authorized to share.</li>
          <li>
            Unlawful, exploitative, or harassing material — including
            anything depicting or sexualizing minors.
          </li>
          <li>
            Attempts to circumvent rate limits, spoof identity, or scrape the
            library at scale outside the API.
          </li>
        </ul>
        <p>
          Violations may result in removal, key revocation, or suspension
          without notice.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T07" title="API terms">
        <p>
          Keys are issued per wallet-verified account and are
          non-transferable. Usage is metered and billed per the published
          rate. MEMEVAULT may suspend a key for abuse, non-payment, or
          violation of these terms.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T08" title="Disclaimer &amp; limitation of liability">
        <p>
          The catalogue — including its status and verdict fields — is
          provided as-is. MEMEVAULT makes no guarantee about the accuracy of
          any classification and isn&apos;t liable for decisions made using
          it. The service is provided without warranty to the extent
          permitted by law.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T09" title="Changes to these terms">
        <p>
          These terms may be updated as the service evolves. Continued use
          after a posted change constitutes acceptance.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—T10" title="Governing law &amp; contact">
        <div className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3.5 text-warn shadow-soft">
          <AlertCircle size={18} strokeWidth={2.25} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium leading-relaxed">
            Not filled in yet: jurisdiction/governing law, and a support or
            legal contact. Both are required before this page goes live.
          </p>
        </div>
      </CatalogSection>

      <PageColophon />
    </main>
  );
}
