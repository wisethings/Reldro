import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { describeAuditAction } from "@/lib/audit";
import { Card } from "@/components/ui/Card";
import { LocalTime } from "@/components/safety/LocalTime";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { staffDetail } from "@/lib/platformAudit";

export const dynamic = "force-dynamic";

/** Everything Reldro staff did in the platform console: creating workspaces, changing seats, suspending, resending invites, product emails, staff sign-ins. */
export default async function StaffActivityPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const p = await searchParams;
  const where = { OR: [{ action: { startsWith: "platform." } }, { action: "product_update.sent" }] };
  const total = await prisma.auditLog.count({ where });
  const page = Math.min(readPage(p.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true } }, organization: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Staff activity</h1>
        <p className="mt-0.5 text-sm text-ink-500">A record of what Reldro staff did in this console, newest first. Customers&apos; security reviews will ask for this.</p>
      </div>
      <Card tone="plain">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">Nothing recorded yet.</p>
        ) : (
          <ol className="divide-y divide-ink-100">
            {rows.map((l) => {
              const detail = staffDetail(l.action, l.metadata);
              return (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900"><span className="font-medium">{l.user?.name ?? "Reldro"}</span> · {describeAuditAction(l.action)}</p>
                    <p className="mt-0.5 break-words text-xs text-ink-500">
                      {l.organization ? <Link href={`/platform-admin/organizations/${l.organization.id}`} className="font-medium text-orchid-deep hover:text-oxblood">{l.organization.name}</Link> : "All customers"}
                      {detail && <> · {detail}</>}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-500"><LocalTime value={l.createdAt} withYear /></span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      <Pagination page={page} total={total} hrefFor={(n) => `/platform-admin/activity${n > 1 ? `?page=${n}` : ""}`} noun="entries" />
    </div>
  );
}
