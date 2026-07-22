import { redirect } from "next/navigation";
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
      <p className="mb-4 text-accent">▍ api key</p>
      <p className="mb-6 text-sm text-dim">
        › programmatic access to the library — read-only, free while it&apos;s
        a foundation, not the paid layer yet. endpoints documented in
        docs/api.md.
      </p>

      {user.status === "BANNED" ? (
        <p className="rounded border border-line px-3 py-2 text-sm text-dim">
          › this account is banned. api keys are disabled.
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
