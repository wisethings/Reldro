import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getOrgTrend, getLatestOrgSnapshot } from "@/lib/queries/adoption";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ScoreRing, ProgressBar } from "@/components/ui/Progress";
import { AdoptionTrendChart } from "@/components/charts/AdoptionTrendChart";
import { Badge } from "@/components/ui/Badge";
import { maturityBand, ORG_MATURITY_LABELS, type OrgMaturityCategory } from "@/lib/scoring";
import { redirect } from "next/navigation";

export default async function OverviewPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  if (session.role === "EMPLOYEE") {
    return <EmployeeOverview employeeId={session.employeeId!} name={session.name} />;
  }

  return <OrgOverview organizationId={session.organizationId} />;
}

async function OrgOverview({ organizationId }: { organizationId: string }) {
  const [org, trend, latest, employeeCount, workflowsDeployed, opportunitiesCount, activeInitiatives, activeProjects, topOpportunities] =
    await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      getOrgTrend(organizationId),
      getLatestOrgSnapshot(organizationId),
      prisma.employee.count({ where: { organizationId } }),
      prisma.organizationWorkflow.count({ where: { organizationId, status: "ADOPTED" } }),
      prisma.opportunity.count({ where: { organizationId } }),
      prisma.initiative.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      prisma.project.count({ where: { organizationId, status: "ACTIVE" } }),
      prisma.opportunity.findMany({
        where: { organizationId, status: { in: ["IDENTIFIED", "PLANNED"] } },
        orderBy: { estAnnualValue: "desc" },
        take: 4,
        include: { department: true },
      }),
    ]);

  const score = latest?.aiAdoptionScore ?? 0;
  const band = maturityBand(score);
  const breakdown: Record<OrgMaturityCategory, number> = {
    literacy: latest?.literacyScore ?? 0,
    usage: latest?.usageScore ?? 0,
    workflowIntegration: latest?.workflowIntegrationScore ?? 0,
    governance: latest?.governanceScore ?? 0,
    measurement: latest?.measurementScore ?? 0,
    leadershipAdoption: latest?.leadershipScore ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Overview</h1>
        <p className="text-sm text-ink-500">How well is {org?.name} adopting AI?</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <p className="text-xs font-medium text-ink-500">AI Adoption Score</p>
            <div className="mt-3">
              <ScoreRing value={score} size={130} label="/ 100" />
            </div>
            <Badge tone="brand" className="mt-3">
              {band.label}
            </Badge>
            <p className="mt-2 text-xs text-ink-500">{band.description}</p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="AI Adoption Score over time" subtitle="Org-wide, last 6 months" />
          <CardBody>
            <AdoptionTrendChart data={trend.map((t) => ({ month: t.month, score: t.score }))} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="AI adoption" value={`${latest?.adoptionPct ?? 0}%`} helpText="Share of employees actively using AI" />
        <StatTile
          label="Employees actively using AI"
          value={`${latest?.activeUsers ?? 0} / ${employeeCount}`}
        />
        <StatTile label="AI workflows deployed" value={workflowsDeployed} />
        <StatTile label="Est. monthly hours saved" value={(latest?.hoursSavedMonthly ?? 0).toLocaleString()} />
        <StatTile label="AI opportunities identified" value={opportunitiesCount} />
        <StatTile label="Active AI initiatives" value={activeInitiatives} />
        <StatTile label="Specialist projects" value={activeProjects} />
        <StatTile label="Company size" value={org?.size ?? "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Maturity breakdown" subtitle="Latest assessment" />
          <CardBody className="space-y-3">
            {(Object.keys(breakdown) as OrgMaturityCategory[]).map((cat) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-600">{ORG_MATURITY_LABELS[cat]}</span>
                  <span className="font-medium text-ink-900">{breakdown[cat]}</span>
                </div>
                <ProgressBar value={breakdown[cat]} className="mt-1" />
              </div>
            ))}
            <Link href="/dashboard/assessment" className="mt-2 inline-block text-xs font-medium text-brand-700 hover:text-brand-800">
              View full assessment →
            </Link>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Top AI opportunities"
            subtitle="Ranked by estimated annual value"
            action={
              <Link href="/dashboard/opportunities" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all →
              </Link>
            }
          />
          <CardBody className="divide-y divide-ink-100 p-0">
            {topOpportunities.length === 0 && <p className="p-5 text-sm text-ink-500">No opportunities identified yet.</p>}
            {topOpportunities.map((o) => (
              <Link key={o.id} href={`/dashboard/opportunities/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-ink-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{o.title}</p>
                  <p className="text-xs text-ink-500">{o.department?.name ?? "Cross-functional"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink-900">${(o.estAnnualValue / 1000).toFixed(0)}k/yr</p>
                  <p className="text-[11px] text-ink-500">{o.estHoursSavedMonthly} hrs/mo</p>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

async function EmployeeOverview({ employeeId, name }: { employeeId: string; name: string }) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, organization: true },
  });
  if (!employee) redirect("/login");

  const [assignedLessons, workflows, opportunity] = await Promise.all([
    prisma.lessonCompletion.findMany({ where: { employeeId }, include: { lesson: { include: { course: true } } } }),
    prisma.organizationWorkflow.findMany({
      where: { organizationId: employee.organizationId },
      include: { workflow: true },
      take: 4,
    }),
    prisma.opportunity.findFirst({
      where: { organizationId: employee.organizationId, departmentId: employee.departmentId ?? undefined },
      orderBy: { estAnnualValue: "desc" },
    }),
  ]);

  const relevantWorkflows = workflows.filter((w) => w.workflow.department === employee.department?.name || !employee.department);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome back, {name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-500">
          {employee.jobTitle} · {employee.department?.name ?? "Unassigned department"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="flex items-center gap-4">
            <ScoreRing value={employee.aiFluencyScore ?? 0} size={72} label="/ 100" />
            <div>
              <p className="text-xs font-medium text-ink-500">Your AI Fluency</p>
              <Link href="/dashboard/assessment" className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View breakdown →
              </Link>
            </div>
          </CardBody>
        </Card>
        <StatTile label="Lessons completed" value={assignedLessons.length} />
        <StatTile label="Workflows available to you" value={relevantWorkflows.length} />
      </div>

      {opportunity && (
        <Card>
          <CardHeader title={`Highest-value opportunity in ${employee.department?.name ?? "your area"}`} />
          <CardBody>
            <p className="text-sm font-medium text-ink-900">{opportunity.title}</p>
            <p className="mt-1 text-sm text-ink-600">{opportunity.aiOpportunity}</p>
            <Link href={`/dashboard/opportunities/${opportunity.id}`} className="mt-3 inline-block text-xs font-medium text-brand-700 hover:text-brand-800">
              Explore this opportunity →
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Recommended for your role"
          action={
            <Link href="/dashboard/workflows" className="text-xs font-medium text-brand-700 hover:text-brand-800">
              Browse workflow library →
            </Link>
          }
        />
        <CardBody className="divide-y divide-ink-100 p-0">
          {relevantWorkflows.length === 0 && <p className="p-5 text-sm text-ink-500">No workflows tailored to your department yet.</p>}
          {relevantWorkflows.map((ow) => (
            <Link key={ow.id} href={`/dashboard/workflows/${ow.workflow.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
              <div>
                <p className="text-sm font-medium text-ink-900">{ow.workflow.title}</p>
                <p className="text-xs text-ink-500">{ow.workflow.timeSavedMinutes} min/day saved · {ow.workflow.difficulty.toLowerCase()} difficulty</p>
              </div>
              <Badge tone={ow.status === "ADOPTED" ? "green" : "neutral"}>{ow.status.replace("_", " ").toLowerCase()}</Badge>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
