import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      <p className="text-accent mb-4">▍ my uploads</p>

      {user.status === "BANNED" && (
        <p className="text-sm border border-line rounded px-3 py-2 mb-6 text-dim">
          › this account is banned. uploads are disabled and existing assets
          stay hidden from the public library.
        </p>
      )}

      {assets.length === 0 ? (
        <p className="text-dim text-sm">› nothing uploaded yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <div key={asset.id} className="border border-line rounded p-4">
              <p className="font-bold">{asset.title}</p>
              <p className="text-dim text-xs mt-1">
                {asset.type} · {asset.status.toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
