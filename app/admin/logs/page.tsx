import Link from "next/link";
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
      <p className="mb-4 text-accent">▍ takedown log</p>

      <form method="GET" className="mb-4 flex flex-wrap gap-2 text-sm">
        <input
          name="assetQuery"
          defaultValue={searchParams.assetQuery}
          placeholder="asset id or title"
          className="rounded border border-line bg-bg px-3 py-1.5 text-text outline-none focus:border-accent"
        />
        <input
          name="actionBy"
          defaultValue={searchParams.actionBy}
          placeholder="admin wallet"
          className="rounded border border-line bg-bg px-3 py-1.5 text-text outline-none focus:border-accent"
        />
        <select
          name="action"
          defaultValue={searchParams.action ?? ""}
          className="rounded border border-line bg-bg px-3 py-1.5 text-text outline-none focus:border-accent"
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
          className="rounded border border-line px-3 py-1.5 hover:border-accent"
        >
          filter
        </button>
        <Link
          href={`/api/admin/logs/export?${exportParams.toString()}`}
          className="rounded border border-accent px-3 py-1.5 text-accent hover:bg-accent hover:text-bg"
        >
          ↓ export csv
        </Link>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm text-dim">› no matching log entries.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded border border-line bg-panel p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-dim">
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
                  className="mt-1 block font-bold hover:text-accent"
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
