import Link from "next/link";
import { KeyRound } from "lucide-react";
import { CatalogHero, CatalogSection, Callout, PageColophon } from "@/components/docs/CatalogPage";

export const metadata = {
  title: "docs — memevault",
  description: "MEMEVAULT API v1 — read-only programmatic access to the catalogue.",
};

export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <CatalogHero
        status="api v1 · free for humans · billed for machines"
        title="Other meme APIs return a file. This one returns a judgment."
        lede="MEMEVAULT is a catalogue of internet culture structured for machines. Every entry is more than a file — it carries the read on whether the format still lands, where it works, and where using it is a mistake."
      >
        <div className="mt-8 overflow-hidden rounded-[24px] border border-line bg-panel shadow-soft-lg">
          <div className="gradient-brand flex items-center justify-between px-5 py-3 text-xs font-medium text-white/90">
            <span className="font-mono">GET /api/v1/assets/distracted-boyfriend</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              target shape
            </span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-text sm:text-[13px]">
{`{
  "id": "distracted-boyfriend",
  "type": "template",
  "status": "dated",
  "peaked": "2017",
  "works_when": "three-way preference, labelled roles",
  "avoid_when": "you want to read as current — this format signals late",
  "license": "free"
}`}
          </pre>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-dim">
          The test is simple: could a machine reading only this metadata,
          never seeing the image, decide correctly whether to use it? That
          verdict layer — <code className="font-mono text-accent">status</code>,{" "}
          <code className="font-mono text-accent">works_when</code>,{" "}
          <code className="font-mono text-accent">avoid_when</code> — is the
          direction, not yet the shipped response. See MV—005 for what{" "}
          <code className="font-mono text-accent">/api/v1/*</code> actually
          returns today.
        </p>
      </CatalogHero>

      <CatalogSection number="MV—000" title="What MEMEVAULT is">
        <p>
          MEMEVAULT is a catalogue of internet meme culture — images, video,
          and sound — searchable and free to download for anyone. Nothing in
          the library is uploaded by MEMEVAULT itself; every asset comes from
          a user, which is what lets MEMEVAULT operate as a platform rather
          than a publisher. The direction we&apos;re building toward is that
          every entry eventually carries a verdict, not just a file: whether
          the format is still current, the context it works in, and the
          context where using it would be a mistake. That structured
          judgment — not the file — is what the API will ultimately sell
          access to.
        </p>
        <p>
          In short: a human comes here to search and download for free. A
          machine comes here through the API to read the catalogue and act
          on it.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—001" title="What you get">
        <p>
          A read API over the whole catalogue — images, video, sound. Search
          returns structured entries, not a blob of files.
        </p>
        <Callout>Humans browse without charge.</Callout>
        <p>
          No login, no wallet, no key — the whole library is searchable and
          downloadable from <code className="font-mono text-accent">/library</code>.
        </p>
        <Callout>Machines are billed per call.</Callout>
        <p>An API key gates programmatic access — not human visitors.</p>
      </CatalogSection>

      <CatalogSection number="MV—002" title="How to use MEMEVAULT">
        <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-xs leading-relaxed text-dim shadow-soft">
          There is no smart contract and no node to run here — MEMEVAULT is a
          web app, not its own chain or protocol. Wallet connection is used
          only to sign in (SIWE), never to deploy or run anything.
        </p>
        <ol className="flex flex-col gap-3">
          <li>
            <span className="font-semibold text-text">1. Browsing the library (everyone)</span> —
            go to <code className="font-mono text-accent">/library</code>, search, download. No
            account, no wallet needed.
          </li>
          <li>
            <span className="font-semibold text-text">2. Getting an API key (developers &amp; agents)</span> —
            connect your wallet from the nav bar and sign in (SIWE — no gas,
            no funds moved), then generate a key at{" "}
            <code className="font-mono text-accent">/my-uploads/api-key</code>. Call
            the API with the key in the Authorization header (see MV—003) —
            usage is metered from the first call.
          </li>
          <li>
            <span className="font-semibold text-text">3. Managing the catalogue (admins)</span> —
            a wallet listed in <code className="font-mono text-accent">ADMIN_WALLETS</code> gets
            an additional panel for reviewing content and takedowns. Not a
            public flow.
          </li>
        </ol>
      </CatalogSection>

      <CatalogSection number="MV—003" title="Authentication">
        <p>
          Every <code className="font-mono text-accent">/api/v1/*</code> call needs a key —
          there is no unauthenticated tier. Generate one from{" "}
          <code className="font-mono text-accent">/my-uploads/api-key</code> after connecting a
          wallet, then send it as either header:
        </p>
        <pre className="overflow-x-auto rounded-2xl border border-line bg-panel px-4 py-3 font-mono text-xs text-text shadow-soft">
{`Authorization: Bearer mvk_••••••••••••••••••••
X-API-Key: mvk_••••••••••••••••••••`}
        </pre>
        <p className="flex items-start gap-2">
          <KeyRound size={15} strokeWidth={2.25} className="mt-0.5 shrink-0 text-dim" />
          Keys are shown once at generation time and never stored in
          retrievable form. Losing it means generating a new one — that
          invalidates the old one. One key per wallet for now.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—004" title="Endpoints">
        <div className="flex flex-col gap-2 font-mono text-xs text-text sm:text-[13px]">
          <p>
            <span className="font-semibold text-accent">GET</span>{" "}
            /api/v1/assets{" "}
            <span className="font-sans text-dim">— search &amp; browse the catalogue (q, type, tag, page, pageSize)</span>
          </p>
          <p>
            <span className="font-semibold text-accent">GET</span>{" "}
            /api/v1/assets/:id{" "}
            <span className="font-sans text-dim">— one entry, full record</span>
          </p>
          <p>
            <span className="font-semibold text-accent">GET</span>{" "}
            /api/v1/assets/:id/download-url{" "}
            <span className="font-sans text-dim">— resolve the fetchable file URL</span>
          </p>
          <p>
            <span className="font-semibold text-accent">GET</span>{" "}
            /api/v1/trending{" "}
            <span className="font-sans text-dim">— what&apos;s live right now</span>
          </p>
        </div>
        <p className="text-xs text-dim">
          Rate limit: <code className="font-mono text-accent">FREE_DEV</code> tier — 100
          requests/day per key. Over the limit gets a{" "}
          <code className="font-mono text-accent">429</code>. Paid tiers aren&apos;t built
          yet.
        </p>
      </CatalogSection>

      <CatalogSection number="MV—005" title="The verdict fields">
        <p>
          The table below is the schema this catalogue is designed to grow
          into — it is <span className="font-semibold text-text">not</span> what
          the API returns today. Today, an entry from{" "}
          <code className="font-mono text-accent">/api/v1/assets/:id</code> carries its title,
          type, tags, file/thumbnail URLs, size, download count, and a{" "}
          <code className="font-mono text-accent">license</code> derived from whether the
          uploader marked it as their original work.
        </p>
        <div className="overflow-hidden rounded-2xl border border-line shadow-soft">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-line">
              <tr className="bg-panel">
                <td className="px-4 py-2.5 font-mono font-semibold text-accent">status</td>
                <td className="px-4 py-2.5 text-dim">emerging · live · peaking · fading · dated · dead</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono font-semibold text-accent">works_when</td>
                <td className="px-4 py-2.5 text-dim">the context the format still lands in</td>
              </tr>
              <tr className="bg-panel">
                <td className="px-4 py-2.5 font-mono font-semibold text-accent">avoid_when</td>
                <td className="px-4 py-2.5 text-dim">where using it reads as a mistake</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono font-semibold text-accent">license</td>
                <td className="px-4 py-2.5 text-dim">free · cc · commercial</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CatalogSection>

      <CatalogSection number="MV—006" title="Ownership &amp; takedown">
        <p>
          MEMEVAULT claims no ownership of the works it catalogues. It claims
          its catalogue: the descriptions, the verdicts, and the notes.
          Assets are uploaded by users, not by the platform. Rights holders
          requesting removal are honoured without argument — see{" "}
          <Link href="/takedown" className="font-medium text-accent underline">
            /takedown
          </Link>
          .
        </p>
      </CatalogSection>

      <PageColophon tagline="Humans browse without charge. Machines are billed. Machines do not mind." />
    </main>
  );
}
