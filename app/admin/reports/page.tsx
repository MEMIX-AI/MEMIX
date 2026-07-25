import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReasonActionButton } from "@/components/admin/ReasonActionButton";
import { resolveAssetUrls } from "@/lib/asset-urls";

// The most important admin page — every OPEN report, newest first.
export default async function AdminReportsPage() {
  const rawReports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { asset: true },
  });
  const reports = await Promise.all(
    rawReports.map(async (r) => ({ ...r, asset: await resolveAssetUrls(r.asset) })),
  );

  return (
    <div>
      <h1 className="mb-5 font-heading text-2xl font-bold text-text">report queue</h1>

      {reports.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel px-6 py-10 text-center text-sm text-dim shadow-soft">
          no open reports.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-line bg-panel p-5 shadow-soft">
              <div className="flex gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-bg">
                  {report.asset.thumbnailUrl ? (
                    <Image
                      src={report.asset.thumbnailUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-dim/50">
                      <ImageOff size={18} strokeWidth={1.75} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/asset/${report.asset.id}`}
                    target="_blank"
                    className="font-heading font-semibold text-text hover:text-accent"
                  >
                    {report.asset.title}
                  </Link>
                  <p className="text-xs font-medium uppercase tracking-wide text-dim">
                    {report.asset.type} · {report.asset.status.toLowerCase()}
                  </p>
                  <p className="mt-2 text-sm text-text">
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

              <div className="mt-4 flex flex-wrap gap-2">
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
