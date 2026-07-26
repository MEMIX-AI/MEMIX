import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiKeyPanel } from "@/components/ApiKeyPanel";

export default async function ApiKeyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const key = await prisma.apiKey.findUnique({
    where: { ownerWallet: user.walletAddress },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-heading text-2xl font-bold text-text">api key</h1>
      <p className="mb-6 text-sm text-dim">
        programmatic access to the library — read-only, free while it&apos;s
        a foundation, not the paid layer yet.
      </p>

      {user.status === "BANNED" ? (
        <p className="flex items-center gap-2.5 rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-dim shadow-soft">
          <Ban size={16} strokeWidth={1.75} className="shrink-0 text-warn" />
          this account is banned. api keys are disabled.
        </p>
      ) : (
        <ApiKeyPanel
          hasKey={!!key}
          tier={key?.tier ?? null}
          createdAt={key?.createdAt.toISOString() ?? null}
          lastUsedAt={key?.lastUsedAt?.toISOString() ?? null}
          requestCount={key?.requestCount ?? 0}
        />
      )}
    </main>
  );
}
