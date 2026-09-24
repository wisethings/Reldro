import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { DeleteInitiativeButton } from "@/components/initiatives/DeleteInitiativeButton";

const STATUS_TONE = { PLANNED: "neutral", IN_PROGRESS: "blue", COMPLETED: "green", ON_HOLD: "amber" } as const;

type KPI = { label: string; baseline: number; current: number; target: number; unit: string };

export default async function InitiativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const initiative = await prisma.initiative.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      members: { include: { employee: { include: { user: true, department: true } } } },
      workflows: { include: { opportunity: { include: { workflow: true } } } },
    },
  });
  if (!initiative) notFound();

  const kpis = (initiative.kpis as unknown as KPI[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/initiatives" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← All initiatives
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{initiative.name}</h1>
            <p className="mt-1 text-sm text-ink-500">{initiative.goalDescription}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={STATUS_TONE[initiative.status]}>{initiative.status.replace("_", " ").toLowerCase()}</Badge>
            {session.role === "COMPANY_ADMIN" && <DeleteInitiativeButton initiativeId={initiative.id} />}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {initiative.departments.map((d) => (
            <Badge key={d}>{d}</Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Duration" value={`${Math.round((initiative.endDate.getTime() - initiative.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`} />
        <Stat label="Departments" value={String(initiative.departments.length)} />
        <Stat label="Employees" value={String(initiative.members.length)} />
        <Stat label="Workflows" value={String(initiative.workflows.length)} />
      </div>

      <Card>
        <CardHeader title="KPIs" />
        <CardBody className="space-y-4">
          {kpis.map((kpi) => {
            const pct = Math.round(((kpi.current - kpi.baseline) / (kpi.target - kpi.baseline || 1)) * 100);
            return (
              <div key={kpi.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{kpi.label}</span>
                  <span className="font-medium text-ink-900">
                    {kpi.current}
                    {kpi.unit} <span className="text-ink-400">/ target {kpi.target}{kpi.unit}</span>
                  </span>
                </div>
                <ProgressBar value={Math.max(0, Math.min(100, pct))} className="mt-1.5" />
                <p className="mt-0.5 text-[11px] text-ink-400">Baseline {kpi.baseline}{kpi.unit}</p>
              </div>
            );
          })}
          {kpis.length === 0 && <p className="text-sm text-ink-500">No KPIs configured.</p>}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Team" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {initiative.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{m.employee.user.name}</p>
                  <p className="text-xs text-ink-500">{m.employee.department?.name}</p>
                </div>
                <Badge>{m.roleOnInitiative}</Badge>
              </div>
            ))}
            {initiative.members.length === 0 && <p className="p-5 text-sm text-ink-500">No members assigned.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Linked opportunities" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {initiative.workflows.map((iw) =>
              iw.opportunity ? (
                <Link key={iw.id} href={`/dashboard/opportunities/${iw.opportunity.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                  <span className="text-sm font-medium text-ink-900">{iw.opportunity.title}</span>
                  <span className="text-xs text-ink-500">${(iw.opportunity.estAnnualValue / 1000).toFixed(0)}k/yr</span>
                </Link>
              ) : null
            )}
            {initiative.workflows.length === 0 && <p className="p-5 text-sm text-ink-500">No opportunities linked yet.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
