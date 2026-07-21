import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Defense in depth: middleware.ts already blocks non-admins from reaching
// this route (Edge-safe env + JWT check). This re-checks server-side with
// a real DB read, in case that first gate is ever bypassed or changed.
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="border border-line rounded p-6 max-w-md w-full">
        <p className="text-accent mb-2">▍ admin panel</p>
        <p className="text-dim text-sm">
          › signed in as {user.walletAddress}. takedown tools and the
          reports queue land in a later phase.
        </p>
      </div>
    </main>
  );
}
