import { Wallet, Ban } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "@/components/UploadForm";

// Real access control happens in /api/upload (see CLAUDE.md — enforcement
// must be server-side, not just a hidden form). This page just decides
// what to render: the form, or an explanation of why it's not showing.
export default async function UploadPage() {
  const user = await getCurrentUser();
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-[34px] font-bold tracking-tight text-text">
          upload an asset
        </h1>
        <p className="mt-2 text-[15px] text-dim">
          add a meme, sound, video, or template to the catalogue — free for
          anyone to download.
        </p>
      </div>

      {!user ? (
        <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-line bg-panel p-6 text-sm text-dim shadow-soft">
          <Wallet size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" />
          connect your wallet to upload. uploading is the one thing on
          memix that needs a wallet — browsing and downloading never do.
        </div>
      ) : user.status === "BANNED" ? (
        <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-line bg-panel p-6 text-sm text-dim shadow-soft">
          <Ban size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warn" />
          this account is banned. uploads are disabled.
        </div>
      ) : (
        <UploadForm existingTags={tags.map((t) => t.name)} creatorWallet={user.walletAddress} />
      )}
    </main>
  );
}
