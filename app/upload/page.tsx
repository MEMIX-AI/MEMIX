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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 font-heading text-2xl font-bold text-text">upload</h1>

      {!user ? (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-6 text-sm text-dim shadow-soft">
          <Wallet size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-accent" />
          connect your wallet to upload. uploading is the one thing on
          memevault that needs a wallet — browsing and downloading never do.
        </div>
      ) : user.status === "BANNED" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-6 text-sm text-dim shadow-soft">
          <Ban size={18} strokeWidth={2.25} className="mt-0.5 shrink-0 text-warn" />
          this account is banned. uploads are disabled.
        </div>
      ) : (
        <UploadForm existingTags={tags.map((t) => t.name)} />
      )}
    </main>
  );
}
