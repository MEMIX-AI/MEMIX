import { redirect } from "next/navigation";
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
      <p className="mb-4 text-accent">▍ my uploads</p>

      {user.status === "BANNED" && (
        <p className="mb-6 rounded border border-line px-3 py-2 text-sm text-dim">
          › this account is banned. uploads are disabled and existing assets
          stay hidden from the public library.
        </p>
      )}

      {assets.length === 0 ? (
        <p className="text-sm text-dim">› nothing uploaded yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <MyUploadCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </main>
  );
}
