import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function ApiKeyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-heading text-2xl font-bold text-text">api key</h1>
      <p className="mb-6 text-sm text-dim">
        programmatic access to the library — read-only, free while it&apos;s
        a foundation, not the paid layer yet.
      </p>

      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-line bg-panel px-6 py-14 text-center shadow-soft">
        <span className="gradient-brand flex h-12 w-12 items-center justify-center rounded-full text-white">
          <Sparkles size={22} strokeWidth={2.25} />
        </span>
        <p className="font-heading text-lg font-bold text-text">coming soon</p>
        <p className="max-w-sm text-sm text-dim">
          key generation for developers &amp; agents is on the way — check
          back soon.
        </p>
      </div>
    </main>
  );
}
