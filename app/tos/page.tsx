import { CURRENT_TOS_VERSION } from "@/lib/declaration";

export const metadata = {
  title: "terms of service — memevault",
};

export default function TosPage() {
  const copyrightEmail = process.env.COPYRIGHT_EMAIL || null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 text-sm">
      <h1 className="mb-1 font-heading text-2xl font-bold text-text">
        terms of service &amp; content policy
      </h1>
      <p className="mb-8 text-xs font-medium uppercase tracking-wide text-dim">
        version {CURRENT_TOS_VERSION}
      </p>

      <div className="flex flex-col gap-4 text-dim">
        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">1. what memevault is</p>
          <p className="leading-relaxed">
            memevault is a free library of user-uploaded memes — images,
            video, sound. anyone can browse, search, and download without an
            account, a wallet, or payment. we don&apos;t upload content
            ourselves — every public asset comes from a user who agreed to
            the declaration below at upload time.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">2. uploading content</p>
          <p className="leading-relaxed">
            when you connect a wallet and upload an asset, you confirm that
            you own it or otherwise have the right to share it, and that it
            doesn&apos;t infringe anyone else&apos;s copyright. that
            confirmation, plus this policy&apos;s version and a timestamp,
            is recorded against your wallet address as a permanent record.
            marking an upload as your original work is a separate claim —
            it&apos;s what may later let you list it for sale once the
            creator marketplace ships. it does not change how the file is
            distributed today: everything in the free library stays free.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">3. no paywalled third-party content</p>
          <p className="leading-relaxed">
            content you don&apos;t hold the rights to never goes behind a
            paywall or paid feature on memevault, regardless of your
            account status. only original work from a verified creator can
            ever be listed for sale.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">4. reports &amp; takedowns</p>
          <p className="leading-relaxed">
            anyone can report any asset, no account required. every report
            is queued for review. admins can take an asset down, restore it,
            delete it outright, or ban an uploader — every one of those
            actions is logged with who did it, when, and why.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">5. banned accounts</p>
          <p className="leading-relaxed">
            a banned wallet can no longer upload, and its existing uploads
            are hidden from the public library. this doesn&apos;t erase the
            underlying records.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">6. no warranty</p>
          <p className="leading-relaxed">
            memevault is provided as-is. we make no guarantee about
            uptime, accuracy, or fitness for any particular purpose.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
          <p className="mb-2 font-heading font-semibold text-text">7. copyright / legal contact</p>
          <p className="leading-relaxed">
            the in-app report button (on every asset) is the fastest way to
            flag something — it goes straight into the admin queue. for
            formal legal notices,{" "}
            {copyrightEmail ? (
              <a href={`mailto:${copyrightEmail}`} className="font-medium text-accent underline">
                {copyrightEmail}
              </a>
            ) : (
              "a contact address will be listed here once configured"
            )}
            .
          </p>
        </section>
      </div>
    </main>
  );
}
