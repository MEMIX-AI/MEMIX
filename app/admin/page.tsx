import { FolderOpen, Download, Flag, ShieldOff } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [totalAssets, downloadAgg, openReports, bannedUsers] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.aggregate({ _sum: { downloadCount: true } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { status: "BANNED" } }),
  ]);

  const stats = [
    { label: "total assets", value: totalAssets, icon: FolderOpen },
    { label: "downloads", value: downloadAgg._sum.downloadCount ?? 0, icon: Download },
    { label: "open reports", value: openReports, icon: Flag },
    { label: "banned users", value: bannedUsers, icon: ShieldOff },
  ];

  return (
    <div>
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">dashboard</h1>
      <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4 shadow-soft">
            <span className="gradient-brand mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <s.icon size={16} strokeWidth={2.25} />
            </span>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">{s.label}</p>
            <p className="font-heading text-xl font-bold text-text">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
