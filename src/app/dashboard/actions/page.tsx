import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { actionWhere } from "@/lib/safety/access";
import { requireViewer } from "@/lib/safety/context";
import { OPEN_ACTION_STATUSES } from "@/lib/safety/pack";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionStatusBadge, dueLabel, EmptyState, PageHeader, SeverityBadge } from "@/components/safety/ui";

import { StatStrip } from "@/components/safety/Dashboard";
export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const v = await requireViewer();
  const { view = v.isSafetyTeam ? "attention" : "open" } = await searchParams;
  const now = new Date();
  const base = actionWhere(v);
  const filters: Record<string, object> = {
    attention: { OR: [{ status: "PROPOSED" }, { status: "COMPLETED" }, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now } }] },
    open: { status: { in: OPEN_ACTION_STATUSES } },
    overdue: { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now } },
    mine: { status: { in: OPEN_ACTION_STATUSES }, ownerId: v.employeeId ?? "__none__" },
    done: { status: { in: ["VERIFIED", "CANCELLED"] } },
    all: {},
  };
  const actions = await prisma.correctiveAction.findMany({
    where: { AND: [base, filters[view] ?? {}] },
    include: { report: { select: { id: true, number: true, title: true } } },
    orderBy: [{ dueDate: "asc" }, { number: "desc" }],
    take: 150,
  });
  const ownerIds = [...new Set(actions.map((a) => a.ownerId).filter((x): x is string => Boolean(x)))];
  const owners = await prisma.employee.findMany({ where: { id: { in: ownerIds } }, include: { user: { select: { name: true } } } });
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const views = v.isSafetyTeam
    ? [["attention", "Needs attention"], ["overdue", "Overdue"], ["open", "All open"], ["mine", "Mine"], ["done", "Done"]]
    : [["open", "Open"], ["overdue", "Overdue"], ["done", "Done"]];
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;

  const day30 = new Date(Date.now() - 30 * 86400_000);
  const [sOpen, sOverdue, sReady, sVerified] = await Promise.all([
    prisma.correctiveAction.count({ where: { AND: [base, { status: { in: OPEN_ACTION_STATUSES } }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: { in: OPEN_ACTION_STATUSES }, dueDate: { lt: now } }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: "COMPLETED" }] } }),
    prisma.correctiveAction.count({ where: { AND: [base, { status: "VERIFIED", verifiedAt: { gte: day30 } }] } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader title={v.isSafetyTeam || v.isSupervisor ? "Corrective actions" : "My corrective actions"} subtitle="Track fixes identified in reports, investigations, and inspections. Verify a fix before closing it." />
      <StatStrip items={[
        { label: "Open", value: sOpen, href: "?view=open" },
        { label: "Overdue", value: sOverdue, href: "?view=overdue", alert: sOverdue > 0 },
        { label: "Ready to verify", value: sReady, href: "?view=attention" },
        { label: "Verified in the last 30 days", value: sVerified, href: "?view=done" },
      ]} />
      <div className="flex flex-wrap gap-2">
        {views.map(([key, label]) => (
          <Link key={key} href={`?view=${key}`} className={chip(view === key)}>{label}</Link>
        ))}
      </div>
      {actions.length === 0 ? (
        <EmptyState title={view === "overdue" ? "No overdue corrective actions" : "No corrective actions need attention"} body="Corrective actions will appear here when a report, investigation, or inspection identifies a follow-up." />
      ) : (
        <Card>
          <ul className="divide-y divide-ink-200">
            {actions.map((a) => {
              const due = dueLabel(a.dueDate, OPEN_ACTION_STATUSES.includes(a.status));
              return (
                <li key={a.id}>
                  <Link href={`/dashboard/actions/${a.id}`} className="block px-4 py-3 hover:bg-ink-50 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-ink-400">A-{a.number}</span>
                      <ActionStatusBadge status={a.status} />
                      <SeverityBadge severity={a.priority} />
                      {due.overdue && <Badge tone="red">{due.text}</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink-900">{a.title}</p>
                    <p className="text-xs text-ink-500">
                      {a.ownerId ? ownerName.get(a.ownerId) ?? "Owner" : "No owner"} · {due.overdue ? "" : `${due.text} · `}{a.report ? `From SR-${String(a.report.number).padStart(4, "0")}` : "From an inspection"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
