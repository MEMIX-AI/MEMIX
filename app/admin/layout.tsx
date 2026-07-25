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

  const links = [
    { href: "/admin", label: "dashboard" },
    { href: "/admin/reports", label: "reports" },
    { href: "/admin/assets", label: "assets" },
    { href: "/admin/users", label: "users" },
    { href: "/admin/logs", label: "logs" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-1.5 rounded-full border border-line bg-white p-1.5 shadow-soft w-fit">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-dim transition-all duration-200 hover:bg-bg hover:text-text"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
