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
      <p className="mb-4 text-accent">▍ user management</p>

      {users.length === 0 ? (
        <p className="text-sm text-dim">› no users yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => {
            const reportCount = reportCountByWallet.get(user.walletAddress) ?? 0;
            return (
              <div
                key={user.walletAddress}
                className="flex flex-wrap items-center gap-4 rounded border border-line bg-panel p-3 text-sm"
              >
                <span className="font-bold" title={user.walletAddress}>
                  {shortenWallet(user.walletAddress)}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-xs uppercase ${
                    user.status === "BANNED"
                      ? "border-line text-dim"
                      : "border-ok text-ok"
                  }`}
                >
                  {user.status.toLowerCase()}
                </span>
                <span className="text-dim">
                  {user._count.assets} asset{user._count.assets === 1 ? "" : "s"}
                </span>
                <span className="text-dim">
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
