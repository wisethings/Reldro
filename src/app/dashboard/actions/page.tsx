import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { actionWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { OPEN_ACTION_STATUSES } from "@/lib/safety/pack";
import { DataRow, DataTable } from "@/components/safety/Table";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, EmptyHero, fmtShort, PageHeader, SeverityBadge } from "@/components/safety/ui";
import { StatStrip } from "@/components/safety/Dashboard";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { ACTION_LIST_FIELDS } from "@/lib/safety/selects";
import { daysUntil, startOfTodayUTC } from "@/lib/safety/dates";
import { LIST_PAGE } from "@/components/ui/layout";
export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ view?: string; page?: string }> }) {
  const v = await requireViewer();
  const { view = v.isSafetyTeam ? "attention" : "open", page: pageParam } = await searchParams;
  const today = startOfTodayUTC();
  const base = actionWhere(v);
  const filters: Record<string, object> = {
    attention: { OR: [{ status: "PROPOSED" }, { status: "COMPLETED" }, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: today } }] },
    open: { status: { in: OPEN_ACTION_STATUSES } },
    overdue: { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: today } },
    mine: { status: { in: OPEN_ACTION_STATUSES }, ownerId: v.employeeId ?? "__none__" },
    done: { status: { in: ["VERIFIED", "CANCELLED"] } },
    all: {},
  };
  const listWhere = { AND: [base, filters[view] ?? {}] };
  const total = await prisma.correctiveAction.count({ where: listWhere });
  const page = Math.min(readPage(pageParam), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const actions = await prisma.correctiveAction.findMany({
    where: listWhere,
    select: { ...ACTION_LIST_FIELDS, report: { select: { id: true, number: true, title: true } } },
    orderBy: [{ dueDate: "asc" }, { number: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const ownerIds = [...new Set(actions.map((a) => a.ownerId).filter((x): x is string => Boolean(x)))];
  const owners = await prisma.employee.findMany({ where: { id: { in: ownerIds } }, include: { user: { select: { name: true } } } });
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const views = v.isSafetyTeam
    ? [["attention", "Needs attention"], ["overdue", "Overdue"], ["open", "All open"], ["mine", "Mine"], ["done", "Done"]]
    : [["open", "Open"], ["overdue", "Overdue"], ["done", "Done"]];
  const chip = (active: boolean) => `pill ${active ? "pill-on" : "pill-off"}`;

  const day30 = new Date(Date.now() - 30 * 86400_000);
  const [sOpen, sOverdue, sReady, sVerified] = await Promise.all([
    prisma.correctiveAction.count({ where: { AND: [base, { status: { in: OPEN_ACTION_STATUSES } }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: today } }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: "COMPLETED" }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: "VERIFIED", verifiedAt: { gte: day30 } }] } }),
  ]);
  const staff = v.isSafetyTeam || v.isSupervisor;
  const template = staff ? "minmax(0,1fr) 8rem 9.5rem 9rem 9rem" : "minmax(0,1fr) 7.5rem 9.5rem 10rem";
  return (
    <div className={LIST_PAGE}>
      <PageHeader title={staff ? "Corrective actions" : "My corrective actions"} subtitle="Track fixes identified in reports, investigations, and inspections. Verify a fix before closing it." />
      <StatStrip large items={[
        { label: "Open", value: sOpen, href: "?view=open" },
        { label: "Overdue", value: sOverdue, href: "?view=overdue", alert: sOverdue > 0 },
        { label: "Ready to verify", value: sReady, href: "?view=attention" },
        { label: "Verified in the last 30 days", value: sVerified, href: "?view=done" },
      ]} />
      <div className="flex flex-wrap gap-2">
        {views.map(([key, label]) => (
          <QueryLink key={key} href={`?view=${key}`} className={chip(view === key)}>{label}</QueryLink>
        ))}
      </div>
      {actions.length === 0 ? (
        <EmptyHero kind="actions" title={view === "overdue" ? "No overdue corrective actions" : "No corrective actions need attention"} body="Corrective actions will appear here when a report, investigation, or inspection identifies a follow-up." steps={[{ href: "/dashboard/reports", title: "Review reports", body: "Add a corrective action from any report." }, { href: "/dashboard/inspections", title: "Run an inspection", body: "Failed items can become corrective actions." }]} />
      ) : (
        <DataTable columns={staff ? ["Corrective action", "Priority", "Status", "Owner", "Due"] : ["Corrective action", "Priority", "Status", "Due"]} template={template}>
          {actions.map((a) => {
            const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
            const owner = a.ownerId ? ownerName.get(a.ownerId) ?? "Owner" : "No owner";
            const open = OPEN_ACTION_STATUSES.includes(a.status);
            const days = a.dueDate ? daysUntil(a.dueDate) : null;
            const soon = open && !due.overdue && days !== null && days <= 3;
            const dueCell = <span className={due.overdue ? "font-semibold text-danger" : soon ? "font-semibold text-amber-deep" : open ? "text-ink-800" : "text-ink-500"}>{due.text}{a.dueDate && open && <span className="block text-xs font-normal text-ink-500">{fmtShort(a.dueDate)}</span>}</span>;
            return (
              <DataRow
                key={a.id}
                href={`/dashboard/actions/${a.id}`}
                tone={due.overdue ? "urgent" : soon ? "warn" : undefined}
                template={template}
                main={
                  <>
                    <p className="line-clamp-2 text-sm font-semibold text-ink-900">{a.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span className="tabular-nums">A-{a.number}</span> · {a.report ? `From SR-${String(a.report.number).padStart(4, "0")}` : "From an inspection"}
                    </p>
                  </>
                }
                chips={
                  <>
                    <ActionStatusBadge status={a.status} />
                    <SeverityBadge severity={a.priority} />
                    {due.overdue && <Badge tone="red">{due.text}</Badge>}
                    <span className={`text-xs ${soon ? "font-semibold text-amber-deep" : "text-ink-500"}`}>{staff ? `${owner}${due.overdue ? "" : " · "}` : ""}{due.overdue ? "" : due.text}</span>
                  </>
                }
                cells={staff
                  ? [<SeverityBadge key="p" severity={a.priority} />, <ActionStatusBadge key="s" status={a.status} />, owner, dueCell]
                  : [<SeverityBadge key="p" severity={a.priority} />, <ActionStatusBadge key="s" status={a.status} />, dueCell]}
              />
            );
          })}
        </DataTable>
      )}
      <Pagination page={page} total={total} noun="corrective actions" hrefFor={(n) => `?view=${view}${n > 1 ? `&page=${n}` : ""}`} />
    </div>
  );
}
