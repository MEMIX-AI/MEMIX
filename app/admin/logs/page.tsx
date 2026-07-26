import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildTakedownLogWhere, TAKEDOWN_ACTIONS } from "@/lib/takedown-log-query";
import { shortenWallet } from "@/lib/format";

// Read-only — this is the compliance evidence trail (CLAUDE.md POSISI
// LEGAL #4), so there is deliberately no edit/delete control anywhere on
// this page.
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; actionBy?: string; assetQuery?: string };
}) {
  const where = buildTakedownLogWhere(searchParams);

  const logs = await prisma.takedownLog.findMany({
    where,
    include: { asset: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const exportParams = new URLSearchParams();
  if (searchParams.action) exportParams.set("action", searchParams.action);
  if (searchParams.actionBy) exportParams.set("actionBy", searchParams.actionBy);
  if (searchParams.assetQuery) exportParams.set("assetQuery", searchParams.assetQuery);

  return (
    <div>
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">takedown log</h1>

      <form method="GET" className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <input
          name="assetQuery"
          defaultValue={searchParams.assetQuery}
          placeholder="asset id or title"
          className="rounded-full border border-line bg-panel px-3.5 py-2 text-text shadow-soft outline-none transition-colors focus:border-accent/50"
        />
        <input
          name="actionBy"
          defaultValue={searchParams.actionBy}
          placeholder="admin wallet"
          className="rounded-full border border-line bg-panel px-3.5 py-2 text-text shadow-soft outline-none transition-colors focus:border-accent/50"
        />
        <select
          name="action"
          defaultValue={searchParams.action ?? ""}
          className="rounded-full border border-line bg-panel px-3.5 py-2 text-text shadow-soft outline-none transition-colors focus:border-accent/50"
        >
          <option value="">all actions</option>
          {TAKEDOWN_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.toLowerCase().replace("_", " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full border border-line bg-panel px-4 py-2 font-medium shadow-soft transition-all duration-250 hover:border-accent/40"
        >
          filter
        </button>
        <Link
          href={`/api/admin/logs/export?${exportParams.toString()}`}
          className="gradient-brand flex items-center gap-1.5 rounded-full px-4 py-2 font-medium text-white shadow-soft transition-all duration-250 hover:shadow-glow"
        >
          <Download size={14} strokeWidth={1.75} />
          export csv
        </Link>
      </form>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          no matching log entries.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-line bg-panel p-4 text-sm shadow-soft">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dim">
                <span className="text-accent">
                  {log.action.replace("_", " ").toLowerCase()}
                </span>
                <span>·</span>
                <span>{log.createdAt.toLocaleString()}</span>
                <span>·</span>
                <span>by {shortenWallet(log.actionBy)}</span>
              </div>
              {log.asset && (
                <Link
                  href={`/asset/${log.asset.id}`}
                  target="_blank"
                  className="mt-1.5 block font-heading font-semibold text-text hover:text-accent"
                >
                  {log.asset.title}
                </Link>
              )}
              {log.targetWallet && (
                <p className="mt-1 text-dim">
                  target user: {shortenWallet(log.targetWallet)}
                </p>
              )}
              <p className="mt-1 text-dim">{log.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
