import { CURRENT_TOS_VERSION } from "@/lib/declaration";

export const metadata = {
  title: "terms of service — memevault",
};

export default function TosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10 text-sm">
      <p className="mb-1 text-accent">▍ terms of service &amp; content policy</p>
      <p className="mb-8 text-xs text-dim">version {CURRENT_TOS_VERSION}</p>

      <div className="flex flex-col gap-6 text-dim">
        <section>
          <p className="mb-2 font-bold text-text">1. what memevault is</p>
          <p>
            memevault is a free library of user-uploaded memes — images,
            video, sound. anyone can browse, search, and download without an
            account, a wallet, or payment. we don&apos;t upload content
            ourselves — every public asset comes from a user who agreed to
            the declaration below at upload time.
          </p>
        </section>

        <section>
          <p className="mb-2 font-bold text-text">2. uploading content</p>
          <p>
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

        <section>
          <p className="mb-2 font-bold text-text">3. no paywalled third-party content</p>
          <p>
            content you don&apos;t hold the rights to never goes behind a
            paywall or paid feature on memevault, regardless of your
            account status. only original work from a verified creator can
            ever be listed for sale.
          </p>
        </section>

        <section>
          <p className="mb-2 font-bold text-text">4. reports &amp; takedowns</p>
          <p>
            anyone can report any asset, no account required. every report
            is queued for review. admins can take an asset down, restore it,
            delete it outright, or ban an uploader — every one of those
            actions is logged with who did it, when, and why.
          </p>
        </section>

        <section>
          <p className="mb-2 font-bold text-text">5. banned accounts</p>
          <p>
            a banned wallet can no longer upload, and its existing uploads
            are hidden from the public library. this doesn&apos;t erase the
            underlying records.
          </p>
        </section>

        <section>
          <p className="mb-2 font-bold text-text">6. no warranty</p>
          <p>
            memevault is provided as-is. we make no guarantee about
            uptime, accuracy, or fitness for any particular purpose.
          </p>
        </section>
      </div>
    </main>
  );
}
