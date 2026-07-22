import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ReasonActionButton } from "@/components/admin/ReasonActionButton";

// The most important admin page — every OPEN report, newest first.
export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { asset: true },
  });

  return (
    <div>
      <p className="mb-4 text-accent">▍ report queue</p>

      {reports.length === 0 ? (
        <p className="text-sm text-dim">› no open reports.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded border border-line bg-panel p-4">
              <div className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-line bg-bg">
                  {report.asset.thumbnailUrl && (
                    <Image
                      src={report.asset.thumbnailUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/asset/${report.asset.id}`}
                    target="_blank"
                    className="font-bold hover:text-accent"
                  >
                    {report.asset.title}
                  </Link>
                  <p className="text-xs uppercase text-dim">
                    {report.asset.type} · {report.asset.status.toLowerCase()}
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="text-dim">reason:</span>{" "}
                    {report.reason.toLowerCase()}
                  </p>
                  <p className="text-sm text-dim">{report.detail}</p>
                  {report.reporterContact && (
                    <p className="mt-1 text-xs text-dim">
                      contact: {report.reporterContact}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-dim">
                    reported {report.createdAt.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ReasonActionButton
                  label="takedown"
                  modalTitle="takedown asset"
                  url={`/api/admin/reports/${report.id}/takedown`}
                  variant="accent"
                  confirmLabel="takedown"
                />
                <ReasonActionButton
                  label="dismiss"
                  modalTitle="dismiss report"
                  url={`/api/admin/reports/${report.id}/dismiss`}
                  confirmLabel="dismiss"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
