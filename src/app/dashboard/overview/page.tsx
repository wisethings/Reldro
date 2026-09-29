import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrgTrend, getLatestOrgSnapshot, getRealAdoptionMetrics } from "@/lib/queries/adoption";
import { getOrgValueCapture } from "@/lib/queries/value";
import { getOrgRecommendations } from "@/lib/recommendations";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ScoreRing, ProgressBar, MilestoneProgressBar } from "@/components/ui/Progress";
import { AdoptionTrendChart } from "@/components/charts/AdoptionTrendChart";
import { Badge } from "@/components/ui/Badge";
import { maturityBand, ORG_MATURITY_LABELS, type OrgMaturityCategory } from "@/lib/scoring";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";
import { getFluencyForEmployee, getStrongestSkill, getWeakestSkill, EMPLOYEE_SKILL_LABELS } from "@/lib/queries/fluency";
import { getWeeklyBrief } from "@/lib/queries/weeklyBrief";
import { getEmployeeRecommendations } from "@/lib/queries/employeeRecommendations";
import { getPointsBalance, getRecentPointsTransactions, getRewardMilestones } from "@/lib/rewards";
import { getAiActivityFeed, ACTIVITY_FEED_TYPE_LABEL, type ActivityFeedAction } from "@/lib/activityFeed";
import { getWorkflowDeploymentStats } from "@/lib/queries/workflowDeployment";
import { ownDepartmentFilter } from "@/lib/departmentVisibility";
import { QueryParamSelect } from "@/components/ui/QueryParamSelect";
import { CardArrow } from "@/components/ui/CardArrow";
import { redirect } from "next/navigation";
import {
  Gauge,
  TrendingUp,
  Newspaper,
  DollarSign,
  Sparkles,
  BarChart3,
  Target,
  Activity,
  FileText,
  BookOpen,
  Share2,
  User,
  Users,
  UserCheck,
  Clock,
  Lightbulb,
  Building2,
  Briefcase,
  Wallet,
  Percent,
  ClipboardCheck,
  Zap,
  Gift,
  Award,
  Heart,
} from "lucide-react";

const MONTHS_OPTIONS = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
];

const ACTIVITY_FILTER_OPTIONS = [
  { value: "all", label: "All activity" },
  ...(Object.entries(ACTIVITY_FEED_TYPE_LABEL) as [ActivityFeedAction, string][]).map(([value, label]) => ({ value, label })),
];

const ACTIVITY_ICON: Record<ActivityFeedAction, { icon: typeof Zap; tone: "orchid" | "olive" | "sage" | "coral" }> = {
  "workflow.adopted": { icon: Zap, tone: "sage" },
  "reward.points_awarded": { icon: Gift, tone: "orchid" },
  "reward.redeemed": { icon: Gift, tone: "olive" },
  "certification.earned": { icon: Award, tone: "olive" },
  "reward.recognition_given": { icon: Heart, tone: "coral" },
};

const RECOMMENDATION_ICON = { opportunity: Target, assessment: ClipboardCheck } as const;

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string; activity?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  if (session.role === "EMPLOYEE") {
    return <EmployeeOverview session={session} name={session.name} />;
  }

  const params = await searchParams;
  return <OrgOverview organizationId={session.organizationId} months={params.months} activity={params.activity} />;
}

async function OrgOverview({ organizationId, months, activity }: { organizationId: string; months?: string; activity?: string }) {
  const monthsCount = [3, 6, 12].includes(Number(months)) ? Number(months) : 6;
  const activityFilter = activity && activity in ACTIVITY_FEED_TYPE_LABEL ? (activity as ActivityFeedAction) : undefined;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    org,
    trend,
    latest,
    metrics,
    workflowsDeployed,
    workflowsDeployedRecently,
    opportunitiesCount,
    opportunitiesCreatedRecently,
    activeInitiatives,
    initiativesCreatedRecently,
    activeProjects,
    projectsCreatedRecently,
    topOpportunities,
    valueCapture,
    recommendations,
    weeklyBrief,
    activityFeed,
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    getOrgTrend(organizationId, monthsCount),
    getLatestOrgSnapshot(organizationId),
    getRealAdoptionMetrics(organizationId),
    prisma.organizationWorkflow.count({ where: { organizationId, status: { in: DEPLOYED_STATUSES } } }),
    prisma.organizationWorkflow.count({ where: { organizationId, status: { in: DEPLOYED_STATUSES }, adoptedAt: { gte: thirtyDaysAgo } } }),
    prisma.opportunity.count({ where: { organizationId } }),
    prisma.opportunity.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.initiative.count({ where: { organizationId, status: "IN_PROGRESS" } }),
    prisma.initiative.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.project.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.project.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.opportunity.findMany({
      where: { organizationId, status: { in: ["IDENTIFIED", "PLANNED"] } },
      orderBy: { estAnnualValue: "desc" },
      take: 4,
      include: { department: true },
    }),
    getOrgValueCapture(organizationId),
    getOrgRecommendations(organizationId),
    getWeeklyBrief(organizationId),
    getAiActivityFeed(organizationId, 12, activityFilter),
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
  // A real month-over-month score delta - both points come from the same
  // survey-based snapshot table, so (unlike the live adoption/hours metrics)
  // this is an honest apples-to-apples comparison.
  const prevScore = trend.length > 1 ? trend[trend.length - 2].score : null;
  const scoreTrend = prevScore !== null ? score - prevScore : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Overview</h1>
          <p className="text-sm text-ink-500">How well is {org?.name} adopting AI?</p>
        </div>
        <QueryParamSelect paramKey="months" options={MONTHS_OPTIONS} defaultValue="6" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <IconBadge icon={<Gauge size={18} />} tone="orchid" className="mx-auto" />
            <p className="mt-2 text-xs font-medium text-ink-500">AI Adoption Score</p>
            <div className="mt-3">
              <ScoreRing value={score} size={130} label="/ 100" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="brand">{band.label}</Badge>
              {scoreTrend !== null && (
                <span className={`text-xs font-medium ${scoreTrend >= 0 ? "text-sage-deep" : "text-danger"}`}>
                  {scoreTrend >= 0 ? "↑" : "↓"} {Math.abs(scoreTrend)} vs last month
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-500">{band.description}</p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<IconBadge icon={<TrendingUp size={18} />} tone="orchid" />}
            title="AI Adoption Score over time"
            subtitle={`Org-wide, last ${monthsCount} months`}
            action={
              scoreTrend !== null ? (
                <Badge tone={scoreTrend >= 0 ? "green" : "red"}>
                  {scoreTrend >= 0 ? "+" : ""}{scoreTrend} vs previous period
                </Badge>
              ) : undefined
            }
          />
          <CardBody>
            <AdoptionTrendChart data={trend.map((t) => ({ month: t.month, score: t.score }))} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<IconBadge icon={<Users size={16} />} tone="orchid" className="h-8 w-8" />}
          label="AI adoption"
          value={`${metrics.adoptionPct}%`}
          helpText="Employees active on Reldro in the last 30 days"
          trend={
            metrics.adoptionPct !== metrics.adoptionPctPrevPeriod
              ? { value: `${Math.abs(metrics.adoptionPct - metrics.adoptionPctPrevPeriod)}pt vs prior 30 days`, positive: metrics.adoptionPct >= metrics.adoptionPctPrevPeriod }
              : undefined
          }
        />
        <StatTile
          icon={<IconBadge icon={<UserCheck size={16} />} tone="sage" className="h-8 w-8" />}
          label="Employees actively using AI"
          value={`${metrics.activeUsers} / ${metrics.totalUsers}`}
          trend={
            metrics.activeUsers !== metrics.activeUsersPrevPeriod
              ? { value: `${Math.abs(metrics.activeUsers - metrics.activeUsersPrevPeriod)} vs prior 30 days`, positive: metrics.activeUsers >= metrics.activeUsersPrevPeriod }
              : undefined
          }
        />
        <StatTile
          icon={<IconBadge icon={<Share2 size={16} />} tone="olive" className="h-8 w-8" />}
          label="AI workflows deployed"
          value={workflowsDeployed}
          trend={workflowsDeployedRecently > 0 ? { value: `${workflowsDeployedRecently} this month`, positive: true } : undefined}
        />
        <StatTile
          icon={<IconBadge icon={<Clock size={16} />} tone="coral" className="h-8 w-8" />}
          label="Est. monthly hours saved"
          value={metrics.hoursSavedMonthly.toLocaleString()}
          helpText="Across all teams with adopted workflows"
        />
        <StatTile
          icon={<IconBadge icon={<Lightbulb size={16} />} tone="orchid" className="h-8 w-8" />}
          label="AI opportunities identified"
          value={opportunitiesCount}
          trend={opportunitiesCreatedRecently > 0 ? { value: `${opportunitiesCreatedRecently} this month`, positive: true } : undefined}
        />
        <StatTile
          icon={<IconBadge icon={<BarChart3 size={16} />} tone="sage" className="h-8 w-8" />}
          label="Active AI initiatives"
          value={activeInitiatives}
          trend={initiativesCreatedRecently > 0 ? { value: `${initiativesCreatedRecently} this month`, positive: true } : undefined}
        />
        <StatTile
          icon={<IconBadge icon={<Briefcase size={16} />} tone="olive" className="h-8 w-8" />}
          label="Specialist projects"
          value={activeProjects}
          trend={projectsCreatedRecently > 0 ? { value: `${projectsCreatedRecently} this month`, positive: true } : undefined}
        />
        <StatTile
          icon={<IconBadge icon={<Building2 size={16} />} tone="coral" className="h-8 w-8" />}
          label="Company size"
          value={org?.size ?? "-"}
        />
      </div>

      <Card>
        <CardHeader
          icon={<IconBadge icon={<Newspaper size={18} />} tone="olive" />}
          title="Your AI adoption brief"
          subtitle="What changed this week, compared to the week before"
          action={
            <Link
              href="/reports/ai-transformation"
              className="shrink-0 rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              View full brief →
            </Link>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<IconBadge icon={<UserCheck size={16} />} tone="orchid" className="h-8 w-8" />}
              label="Active users"
              value={weeklyBrief.activeUsersThisWeek}
              trend={{
                value: `${Math.abs(weeklyBrief.activeUsersThisWeek - weeklyBrief.activeUsersLastWeek)} vs last week`,
                positive: weeklyBrief.activeUsersThisWeek >= weeklyBrief.activeUsersLastWeek,
              }}
            />
            <StatTile
              icon={<IconBadge icon={<Gauge size={16} />} tone="sage" className="h-8 w-8" />}
              label="AI fluency"
              value={weeklyBrief.fluencyNow ?? "-"}
              helpText={
                weeklyBrief.fluencyNow !== null && weeklyBrief.fluencyLastWeek !== null
                  ? `${weeklyBrief.fluencyNow >= weeklyBrief.fluencyLastWeek ? "+" : ""}${weeklyBrief.fluencyNow - weeklyBrief.fluencyLastWeek} vs last week`
                  : "Not enough data yet"
              }
            />
            <StatTile
              icon={<IconBadge icon={<BookOpen size={16} />} tone="olive" className="h-8 w-8" />}
              label="Lessons completed"
              value={weeklyBrief.lessonsCompletedThisWeek}
              helpText={`${weeklyBrief.lessonsCompletedLastWeek} last week`}
            />
            <StatTile
              icon={<IconBadge icon={<DollarSign size={16} />} tone="coral" className="h-8 w-8" />}
              label="Value captured this week"
              value={`$${Math.round(weeklyBrief.valueCapturedThisWeek / 1000)}k`}
            />
          </div>
          {(weeklyBrief.workflowsNewlyAdopted.length > 0 || weeklyBrief.fastestGrowingDepartment) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">What changed</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-700">
                {weeklyBrief.workflowsNewlyAdopted.map((w) => (
                  <li key={w.id}>
                    <Link href={`/dashboard/workflows/${w.id}`} className="text-orchid-deep hover:text-oxblood">{w.title}</Link> was newly adopted this week.
                  </li>
                ))}
                {weeklyBrief.fastestGrowingDepartment && (
                  <li>
                    {weeklyBrief.fastestGrowingDepartment.name} is the fastest-growing team this week (+{weeklyBrief.fastestGrowingDepartment.delta} active users).
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<IconBadge icon={<DollarSign size={18} />} tone="olive" />}
          title="AI transformation value"
          subtitle="Estimated potential value vs. value captured from adopted workflows"
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<IconBadge icon={<DollarSign size={16} />} tone="orchid" className="h-8 w-8" />}
              label="Potential AI value"
              value={`$${(valueCapture.potentialValue / 1000).toFixed(0)}k`}
              helpText="Estimated, across all identified opportunities"
            />
            <StatTile
              icon={<IconBadge icon={<Wallet size={16} />} tone="sage" className="h-8 w-8" />}
              label="Value captured"
              value={`$${(valueCapture.capturedValue / 1000).toFixed(0)}k`}
              helpText="From opportunities whose workflow is adopted"
            />
            <StatTile
              icon={<IconBadge icon={<Target size={16} />} tone="coral" className="h-8 w-8" />}
              label="Value remaining"
              value={`$${(valueCapture.remainingValue / 1000).toFixed(0)}k`}
              helpText="Potential minus captured"
            />
            <StatTile
              icon={<IconBadge icon={<Percent size={16} />} tone="olive" className="h-8 w-8" />}
              label="Capture rate"
              value={`${valueCapture.captureRatePct}%`}
              helpText="Captured ÷ potential"
            />
          </div>
        </CardBody>
      </Card>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader
            icon={<IconBadge icon={<Sparkles size={18} />} tone="orchid" />}
            title="What should we do next?"
            subtitle="Recommended based on your opportunities and assessment"
          />
          <CardBody className="space-y-4">
            {recommendations.map((rec) => {
              const RecIcon = RECOMMENDATION_ICON[rec.category];
              return (
              <div key={rec.id} className="rounded-xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <IconBadge icon={<RecIcon size={18} />} tone={rec.category === "opportunity" ? "coral" : "sage"} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">{rec.title}</p>
                      <p className="mt-1 text-sm text-ink-600">{rec.reason}</p>
                    </div>
                  </div>
                  <Link
                    href={rec.actionHref}
                    className="shrink-0 rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800"
                  >
                    {rec.actionLabel}
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rec.evidence.map((e) => (
                    <Badge key={e} tone="neutral">{e}</Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-500">Expected impact: {rec.expectedImpact}</p>
                {(rec.relatedWorkflowHref || rec.relatedLearningHref) && (
                  <div className="mt-2 flex flex-wrap gap-4 text-xs">
                    {rec.relatedWorkflowHref && (
                      <Link href={rec.relatedWorkflowHref} className="font-medium text-orchid-deep hover:text-oxblood">
                        Related workflow: {rec.relatedWorkflowLabel} →
                      </Link>
                    )}
                    {rec.relatedLearningHref && (
                      <Link href={rec.relatedLearningHref} className="font-medium text-orchid-deep hover:text-oxblood">
                        Related learning: {rec.relatedLearningLabel} →
                      </Link>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            icon={<IconBadge icon={<BarChart3 size={18} />} tone="orchid" />}
            title="Maturity breakdown"
            subtitle="Latest assessment"
          />
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
            <Link href="/dashboard/assessment" className="mt-2 inline-block text-xs font-medium text-orchid-deep hover:text-oxblood">
              View full assessment →
            </Link>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            icon={<IconBadge icon={<Target size={18} />} tone="olive" />}
            title="Top AI opportunities"
            subtitle="Ranked by estimated annual value"
            action={
              <Link href="/dashboard/opportunities" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
                View all →
              </Link>
            }
          />
          <CardBody className="divide-y divide-ink-200 p-0">
            {topOpportunities.length === 0 && <p className="p-5 text-sm text-ink-500">No opportunities identified yet.</p>}
            {topOpportunities.map((o) => (
              <Link key={o.id} href={`/dashboard/opportunities/${o.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-ink-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{o.title}</p>
                  <p className="text-xs text-ink-500">{o.department?.name ?? "Cross-functional"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink-900">${(o.estAnnualValue / 1000).toFixed(0)}k/yr</p>
                  <p className="text-[11px] text-ink-500">{o.estHoursSavedMonthly} hrs/mo</p>
                </div>
                <CardArrow />
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={<IconBadge icon={<Activity size={18} />} tone="sage" />}
          title="AI activity"
          subtitle="Real activity across the organization: learning, workflow adoption, and recognition"
          action={<QueryParamSelect paramKey="activity" options={ACTIVITY_FILTER_OPTIONS} defaultValue="all" />}
        />
        <CardBody className="divide-y divide-ink-200 p-0">
          {activityFeed.length === 0 && <p className="p-5 text-sm text-ink-500">No activity matches this filter yet.</p>}
          {activityFeed.map((item) => {
            const { icon: ItemIcon, tone } = ACTIVITY_ICON[item.action];
            return (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <IconBadge icon={<ItemIcon size={16} />} tone={tone} className="h-8 w-8" />
                <p className="min-w-0 flex-1 text-sm text-ink-800">{item.text}</p>
                <span className="shrink-0 text-xs text-ink-400">{item.createdAt.toLocaleDateString()}</span>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

async function EmployeeOverview({ session, name }: { session: SessionPayload; name: string }) {
  const employeeId = session.employeeId!;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, organization: true },
  });
  if (!employee) redirect("/login");

  const ownDepartment = ownDepartmentFilter(session, employee);

  const [
    assignedLessons,
    totalLessonsInScope,
    workflows,
    opportunity,
    fluency,
    recommendations,
    pointsBalance,
    recentPoints,
    rewardMilestones,
  ] = await Promise.all([
    prisma.lessonCompletion.findMany({ where: { employeeId }, include: { lesson: { include: { course: true } } } }),
    prisma.course
      .findMany({
        where: { OR: [{ organizationId: null }, { organizationId: employee.organizationId }], department: ownDepartment },
        include: { _count: { select: { lessons: true } } },
      })
      .then((courses) => courses.reduce((sum, c) => sum + c._count.lessons, 0)),
    prisma.organizationWorkflow.findMany({
      where: { organizationId: employee.organizationId },
      include: { workflow: true },
      take: 4,
    }),
    prisma.opportunity.findFirst({
      where: { organizationId: employee.organizationId, departmentId: employee.departmentId ?? undefined },
      orderBy: { estAnnualValue: "desc" },
      include: { workflow: true },
    }),
    getFluencyForEmployee(employeeId),
    getEmployeeRecommendations(employeeId),
    getPointsBalance(employeeId),
    getRecentPointsTransactions(employeeId, 3),
    getRewardMilestones(employeeId, employee.organizationId),
  ]);

  const relevantWorkflows = workflows.filter((w) => w.workflow.department === employee.department?.name || !employee.department);
  const opportunityAdopters = opportunity?.workflowId
    ? await getWorkflowDeploymentStats(employee.organizationId, { id: opportunity.workflowId, department: opportunity.workflow!.department, steps: [] })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome back, {name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-500">
          {employee.jobTitle} · {employee.department?.name ?? "Unassigned department"}
        </p>
      </div>

      {recommendations.length > 0 && (
        <Card>
          <CardHeader
            icon={<IconBadge icon={<Sparkles size={18} />} tone="orchid" />}
            title="What should I do next?"
            subtitle="Personalized based on your skills, workflows, and activity"
          />
          <CardBody className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 p-3">
                <div className="flex min-w-0 items-start gap-3">
                  <IconBadge icon={<FileText size={16} />} tone="orchid" className="h-8 w-8" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {rec.title}
                      {rec.estimatedMinutes && <span className="ml-2 text-xs font-normal text-ink-500">{rec.estimatedMinutes} min</span>}
                    </p>
                    <p className="text-xs text-ink-500">{rec.reason}</p>
                  </div>
                </div>
                <Link
                  href={rec.actionHref}
                  className="shrink-0 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800"
                >
                  {rec.actionLabel}
                </Link>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          icon={<IconBadge icon={<BarChart3 size={18} />} tone="olive" />}
          title="Your AI progress"
          action={
            <Link href="/dashboard/rewards" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
              View rewards →
            </Link>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-ink-900">{pointsBalance.toLocaleString()} pts</p>
              {rewardMilestones.length > 1 ? (
                <p className="text-xs text-ink-500">
                  {rewardMilestones[1].value - pointsBalance} pts away from {rewardMilestones[1].label}
                </p>
              ) : (
                <p className="text-xs text-ink-500">Earned from real progress: learning paths, simulations, workflows, and recognition</p>
              )}
            </div>
            {recentPoints.length > 0 && (
              <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
                {recentPoints.map((t) => (
                  <p key={t.id} className="truncate text-xs text-ink-600">
                    <span className={t.amount >= 0 ? "font-medium text-sage-deep" : "font-medium text-ink-500"}>
                      {t.amount >= 0 ? "+" : ""}{t.amount}
                    </span>{" "}
                    {t.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
          {rewardMilestones.length > 1 && <MilestoneProgressBar value={pointsBalance} milestones={rewardMilestones} />}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader
            icon={<IconBadge icon={<Gauge size={18} />} tone="orchid" />}
            title={
              <span className="flex items-center gap-1.5">
                Your AI Fluency
                <InfoTooltip text="This measures how effectively you use AI. AI adoption measures how much you use it." />
              </span>
            }
          />
          <CardBody className="flex items-center gap-4">
            <ScoreRing value={employee.aiFluencyScore ?? 0} size={72} label="/ 100" />
            <div>
              {fluency && (
                <p className="text-[11px] text-ink-600">
                  Strongest: {EMPLOYEE_SKILL_LABELS[getStrongestSkill(fluency.breakdown)]} · Focus area: {EMPLOYEE_SKILL_LABELS[getWeakestSkill(fluency.breakdown)]}
                </p>
              )}
              <Link href="/dashboard/assessment" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
                View breakdown →
              </Link>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<IconBadge icon={<BookOpen size={18} />} tone="orchid" />} title="Lessons completed" />
          <CardBody>
            <p className="text-2xl font-semibold text-ink-900">
              {assignedLessons.length} <span className="text-sm font-normal text-ink-500">of {totalLessonsInScope}</span>
            </p>
            <p className="text-xs text-ink-500">
              {totalLessonsInScope > 0 ? Math.round((assignedLessons.length / totalLessonsInScope) * 100) : 0}% complete
            </p>
            <ProgressBar value={assignedLessons.length} max={totalLessonsInScope || 1} className="mt-2" />
            <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-orchid-deep" /> Completed {assignedLessons.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-200" /> Not started {Math.max(0, totalLessonsInScope - assignedLessons.length)}
              </span>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<IconBadge icon={<Share2 size={18} />} tone="olive" />} title="Workflows available to you" />
          <CardBody>
            <p className="text-2xl font-semibold text-ink-900">{relevantWorkflows.length}</p>
            <p className="text-xs text-ink-500">Based on your role, team, and recent activity.</p>
            <Link href="/dashboard/workflows" className="mt-1 inline-block text-xs font-medium text-orchid-deep hover:text-oxblood">
              Browse workflows →
            </Link>
          </CardBody>
        </Card>
      </div>

      {opportunity && (
        <Card>
          <CardHeader
            icon={<IconBadge icon={<Target size={18} />} tone="olive" />}
            title={`Highest-value opportunity in ${employee.department?.name ?? "your area"}`}
          />
          <CardBody>
            <p className="text-sm font-medium text-ink-900">{opportunity.title}</p>
            <p className="mt-1 text-sm text-ink-600">{opportunity.aiOpportunity}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={opportunity.impact === "HIGH" ? "green" : opportunity.impact === "MEDIUM" ? "amber" : "neutral"}>
                {opportunity.impact.toLowerCase()} impact
              </Badge>
              {opportunity.workflow && <Badge>Est. {opportunity.workflow.timeSavedMinutes} min/day</Badge>}
              {opportunityAdopters && opportunityAdopters.activeAdopters > 0 && (
                <Badge>Used by {opportunityAdopters.activeAdopters} teammate{opportunityAdopters.activeAdopters === 1 ? "" : "s"}</Badge>
              )}
            </div>
            <Link href={`/dashboard/opportunities/${opportunity.id}`} className="mt-3 inline-block text-xs font-medium text-orchid-deep hover:text-oxblood">
              Explore this opportunity →
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          icon={<IconBadge icon={<User size={18} />} tone="olive" />}
          title="Recommended for your role"
          action={
            <Link href="/dashboard/workflows" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
              Browse workflow library →
            </Link>
          }
        />
        <CardBody className="divide-y divide-ink-200 p-0">
          {relevantWorkflows.length === 0 && <p className="p-5 text-sm text-ink-500">No workflows tailored to your department yet.</p>}
          {relevantWorkflows.map((ow) => (
            <Link key={ow.id} href={`/dashboard/workflows/${ow.workflow.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50">
              <div className="flex min-w-0 items-center gap-3">
                <IconBadge icon={<FileText size={14} />} tone="orchid" className="h-8 w-8" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{ow.workflow.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone="neutral">{ow.workflow.department}</Badge>
                    <Badge tone="neutral">{ow.workflow.difficulty.toLowerCase()} difficulty</Badge>
                  </div>
                </div>
              </div>
              <Badge tone={ow.status === "ADOPTED" ? "green" : "neutral"}>{ow.status.replace("_", " ").toLowerCase()}</Badge>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
