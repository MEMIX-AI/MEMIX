import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

// Defense in depth: middleware.ts already blocks non-admins from reaching
// anything under /admin (Edge-safe env + JWT check). This re-checks
// server-side with a real DB read, in case that first gate is ever
// bypassed or changed — and centralizes it here instead of repeating the
// check in every /admin/* page.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  return (
    <main className="flex-1 px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 text-sm text-dim">
        <Link href="/admin" className="hover:text-accent">
          [dashboard]
        </Link>
        <Link href="/admin/reports" className="hover:text-accent">
          [reports]
        </Link>
        <Link href="/admin/assets" className="hover:text-accent">
          [assets]
        </Link>
        <Link href="/admin/users" className="hover:text-accent">
          [users]
        </Link>
        <Link href="/admin/logs" className="hover:text-accent">
          [logs]
        </Link>
      </nav>
      {children}
    </main>
  );
}
