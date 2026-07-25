import { FolderOpen, Flag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { shortenWallet } from "@/lib/format";
import { ReasonActionButton } from "@/components/admin/ReasonActionButton";

export default async function AdminUsersPage() {
  const [users, reports] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { assets: true } } },
    }),
    prisma.report.findMany({ select: { asset: { select: { uploaderWallet: true } } } }),
  ]);

  // Report model relates to Asset, not directly to User — count in memory
  // rather than a raw SQL join, fine at this dataset size.
  const reportCountByWallet = new Map<string, number>();
  for (const report of reports) {
    const wallet = report.asset.uploaderWallet;
    if (!wallet) continue;
    reportCountByWallet.set(wallet, (reportCountByWallet.get(wallet) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">user management</h1>

      {users.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          no users yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {users.map((user) => {
            const reportCount = reportCountByWallet.get(user.walletAddress) ?? 0;
            return (
              <div
                key={user.walletAddress}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-panel p-4 text-sm shadow-soft"
              >
                <span className="font-heading font-semibold text-text" title={user.walletAddress}>
                  {shortenWallet(user.walletAddress)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    user.status === "BANNED"
                      ? "border-line bg-bg text-dim"
                      : "border-ok/30 bg-ok/10 text-ok"
                  }`}
                >
                  {user.status.toLowerCase()}
                </span>
                <span className="flex items-center gap-1.5 text-dim">
                  <FolderOpen size={13} strokeWidth={2.25} />
                  {user._count.assets} asset{user._count.assets === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1.5 text-dim">
                  <Flag size={13} strokeWidth={2.25} />
                  {reportCount} report{reportCount === 1 ? "" : "s"}
                </span>
                <div className="ml-auto">
                  {user.status === "BANNED" ? (
                    <ReasonActionButton
                      label="unban"
                      modalTitle="unban user"
                      url={`/api/admin/users/${user.walletAddress}/unban`}
                      confirmLabel="unban"
                    />
                  ) : (
                    <ReasonActionButton
                      label="ban"
                      modalTitle="ban user"
                      url={`/api/admin/users/${user.walletAddress}/ban`}
                      confirmLabel="ban"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
