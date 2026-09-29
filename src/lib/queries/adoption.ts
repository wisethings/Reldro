import "server-only";
import { prisma } from "@/lib/prisma";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

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
/**
 * The prior-30-day window's active-user count, computed the exact same way
 * as the current one - a genuine trailing comparison rather than a guess,
 * since there's no stored history of this live metric to compare against
 * (AdoptionMetricSnapshot's activeUsers/adoptionPct predate this live
 * computation and use a different methodology, so diffing against it would
 * compare two incompatible numbers).
 */
async function getActiveUserCountForWindow(organizationId: string, from: Date, to: Date) {
  const [fromUsageEvents, fromLessons] = await Promise.all([
    prisma.aIUsageEvent.findMany({
      where: { organizationId, createdAt: { gte: from, lt: to }, employeeId: { not: null } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.lessonCompletion.findMany({
      where: { completedAt: { gte: from, lt: to }, employee: { organizationId } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
  ]);
  return new Set([...fromUsageEvents.map((e) => e.employeeId), ...fromLessons.map((e) => e.employeeId)]).size;
}

export async function getRealAdoptionMetrics(organizationId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [totalUsers, activeUsers, activeUsersPrevPeriod, adoptedWorkflows] = await Promise.all([
    prisma.employee.count({ where: { organizationId } }),
    getActiveUserCountForWindow(organizationId, thirtyDaysAgo, now),
    getActiveUserCountForWindow(organizationId, sixtyDaysAgo, thirtyDaysAgo),
    prisma.organizationWorkflow.findMany({ where: { organizationId, status: { in: DEPLOYED_STATUSES } }, select: { workflowId: true } }),
  ]);

  const adoptionPct = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const adoptionPctPrevPeriod = totalUsers > 0 ? Math.round((activeUsersPrevPeriod / totalUsers) * 100) : 0;

  const adoptedWorkflowIds = adoptedWorkflows.map((w) => w.workflowId);
  const hoursSavedMonthly = adoptedWorkflowIds.length
    ? await prisma.opportunity
        .aggregate({
          where: { organizationId, workflowId: { in: adoptedWorkflowIds } },
          _sum: { estHoursSavedMonthly: true },
        })
        .then((r) => r._sum.estHoursSavedMonthly ?? 0)
    : 0;

  return { totalUsers, activeUsers, activeUsersPrevPeriod, adoptionPct, adoptionPctPrevPeriod, hoursSavedMonthly };
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
