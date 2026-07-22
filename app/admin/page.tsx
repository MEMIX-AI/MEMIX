import { prisma } from "@/lib/prisma";
import { SpecCell } from "@/components/SpecCell";

export default async function AdminDashboardPage() {
  const [totalAssets, downloadAgg, openReports, bannedUsers] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.aggregate({ _sum: { downloadCount: true } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.user.count({ where: { status: "BANNED" } }),
  ]);

  return (
    <div>
      <p className="mb-4 text-accent">▍ dashboard</p>
      <div className="grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
        <SpecCell label="total assets" value={String(totalAssets)} />
        <SpecCell
          label="downloads"
          value={String(downloadAgg._sum.downloadCount ?? 0)}
        />
        <SpecCell label="open reports" value={String(openReports)} />
        <SpecCell label="banned users" value={String(bannedUsers)} />
      </div>
    </div>
  );
}
