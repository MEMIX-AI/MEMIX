import Link from "next/link";
import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "terms — memix",
  description: "The rules of the catalogue.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="draft — not yet in force"
        title="The rules of the catalogue."
        lede="Plain terms for using MEMIX — as a browser, an uploader, or a machine calling the API."
      >
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-dim">
          Last updated: draft — insert date on publish · this is a starting
          draft, not legal advice. Have counsel review before you rely on it.
        </p>
      </CatalogHero>

      <CatalogSection title="What MEMIX is">
        <p>
          MEMIX is a catalogue and search platform for internet meme
          assets. It does not create the works in the catalogue — assets are
          uploaded by users, not MEMIX.
        </p>
        <Callout>
          MEMIX is a hosting and cataloguing platform, not a publisher of
          the works it indexes.
        </Callout>
      </CatalogSection>

      <CatalogSection title="What is free, and what is paid">
        <p>
          Browsing and downloading are free for anyone — no account, no
          wallet, no charge. Programmatic access (search, entry data,
          verdicts via the API) requires an API key and is billed to the
          calling application — this is access to MEMIX&apos;s catalogue
          and metadata, not a sale of the underlying asset.
        </p>
        <p>
          Wallet connection is identity only — signing in, generating an API
          key, or opening a creator shop. It never triggers a payment or an
          on-chain transaction by itself.
        </p>
      </CatalogSection>

      <CatalogSection title="Uploading content">
        <p>
          An uploader must confirm ownership of, or authorization to share,
          each asset at upload time; that declaration is recorded and
          retained. Uploading grants MEMIX a license to host, display,
          and catalogue the asset — the uploader retains ownership.
        </p>
      </CatalogSection>

      <CatalogSection title="Ownership">
        <p>
          MEMIX claims no ownership of the works it catalogues. It
          claims its catalogue: the descriptions, verdicts, status labels,
          and structure. Rights to the underlying image, clip, or sound
          remain with the prior rights holder.
        </p>
      </CatalogSection>

      <CatalogSection title="Takedown &amp; reporting">
        <p>
          A rights holder may request removal at any time; requests are
          honoured without argument. See{" "}
          <Link href="/takedown" className="font-medium text-accent underline">
            /takedown
          </Link>
          . Every request and its resolution is logged and retained.
        </p>
        <p className="text-xs text-dim">
          Removal affects the asset and MEMIX&apos;s own file access —
          cached copies outside MEMIX&apos;s systems are outside its
          control.
        </p>
      </CatalogSection>

      <CatalogSection title="Prohibited content and conduct">
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

      <CatalogSection title="API terms">
        <p>
          Keys are issued per wallet-verified account and are
          non-transferable. Usage is metered and billed per the published
          rate. MEMIX may suspend a key for abuse, non-payment, or
          violation of these terms.
        </p>
      </CatalogSection>

      <CatalogSection title="Disclaimer &amp; limitation of liability">
        <p>
          The catalogue — including its status and verdict fields — is
          provided as-is. MEMIX makes no guarantee about the accuracy of
          any classification and isn&apos;t liable for decisions made using
          it. The service is provided without warranty to the extent
          permitted by law.
        </p>
      </CatalogSection>

      <CatalogSection title="Changes to these terms">
        <p>
          These terms may be updated as the service evolves. Continued use
          after a posted change constitutes acceptance.
        </p>
      </CatalogSection>

      <CatalogSection title="Governing law &amp; contact">
        <p>Questions about these terms? Reach out at memix631@gmail.com.</p>
      </CatalogSection>

      <PageColophon />
    </main>
  );
}
