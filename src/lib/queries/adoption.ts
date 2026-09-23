import "server-only";
import { prisma } from "@/lib/prisma";

export async function getOrgTrend(organizationId: string, months = 6) {
  const snapshots = await prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, department: null },
    orderBy: { month: "asc" },
  });
  return snapshots.slice(-months).map((s) => ({
    month: s.month.toLocaleString("en-US", { month: "short" }),
    score: s.aiAdoptionScore,
    raw: s,
  }));
}

export async function getLatestOrgSnapshot(organizationId: string) {
  return prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: null },
    orderBy: { month: "desc" },
  });
}

/**
 * Real, computed-on-request adoption metrics - the antidote to the frozen
 * guesses that used to live on AdoptionMetricSnapshot. totalUsers/activeUsers
 * come from actual employee records and actual recent activity
 * (AIUsageEvent + LessonCompletion in the last 30 days); hoursSavedMonthly
 * is the sum of the estimated value of opportunities whose workflow the org
 * has actually adopted. The survey-based AI Adoption Score itself stays on
 * the snapshot table - a maturity score being based on self-reported
 * answers is normal, that part was never the problem.
 */
export async function getRealAdoptionMetrics(organizationId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeFromUsageEvents, activeFromLessons, adoptedWorkflows] = await Promise.all([
    prisma.employee.count({ where: { organizationId } }),
    prisma.aIUsageEvent.findMany({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo }, employeeId: { not: null } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.lessonCompletion.findMany({
      where: { completedAt: { gte: thirtyDaysAgo }, employee: { organizationId } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.organizationWorkflow.findMany({ where: { organizationId, status: "ADOPTED" }, select: { workflowId: true } }),
  ]);

  const activeEmployeeIds = new Set([
    ...activeFromUsageEvents.map((e) => e.employeeId),
    ...activeFromLessons.map((e) => e.employeeId),
  ]);
  const activeUsers = activeEmployeeIds.size;
  const adoptionPct = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const adoptedWorkflowIds = adoptedWorkflows.map((w) => w.workflowId);
  const hoursSavedMonthly = adoptedWorkflowIds.length
    ? await prisma.opportunity
        .aggregate({
          where: { organizationId, workflowId: { in: adoptedWorkflowIds } },
          _sum: { estHoursSavedMonthly: true },
        })
        .then((r) => r._sum.estHoursSavedMonthly ?? 0)
    : 0;

  return { totalUsers, activeUsers, adoptionPct, hoursSavedMonthly };
}

export async function getDepartmentSnapshots(organizationId: string) {
  const latestMonth = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: { not: null } },
    orderBy: { month: "desc" },
    select: { month: true },
  });
  if (!latestMonth) return [];
  return prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, month: latestMonth.month, department: { not: null } },
    orderBy: { adoptionPct: "desc" },
  });
}
