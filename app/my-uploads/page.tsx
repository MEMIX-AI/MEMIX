import { redirect } from "next/navigation";
import Link from "next/link";
import { Ban } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MyUploadCard } from "@/components/MyUploadCard";

// Requires a connected + signed-in wallet — visitors without a wallet
// never need to hit this page (see CLAUDE.md PERAN & AKSES).
export default async function MyUploadsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const assets = await prisma.asset.findMany({
    where: { uploaderWallet: user.walletAddress },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex-1 px-6 py-10">
      <h1 className="mb-6 font-heading text-2xl font-bold text-text">my uploads</h1>

      {user.status === "BANNED" && (
        <p className="mb-6 flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dim shadow-soft">
          <Ban size={16} strokeWidth={2.25} className="shrink-0 text-warn" />
          this account is banned. uploads are disabled and existing assets
          stay hidden from the public library.
        </p>
      )}

      {assets.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-6 py-10 text-center text-sm text-dim shadow-soft">
          {user.status === "BANNED" ? (
            "nothing uploaded yet."
          ) : (
            <>
              nothing uploaded yet.{" "}
              <Link href="/upload" className="font-medium text-accent hover:underline">
                upload your first one
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <MyUploadCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </main>
  );
}
