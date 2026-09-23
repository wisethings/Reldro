import "server-only";
import { prisma } from "@/lib/prisma";

export type WeeklyBrief = {
  activeUsersThisWeek: number;
  activeUsersLastWeek: number;
  totalEmployees: number;
  fluencyNow: number | null;
  fluencyLastWeek: number | null;
  lessonsCompletedThisWeek: number;
  lessonsCompletedLastWeek: number;
  workflowsNewlyAdopted: { id: string; title: string }[];
  valueCapturedThisWeek: number;
  fastestGrowingDepartment: { name: string; activeThisWeek: number; delta: number } | null;
};

/**
 * A real week-over-week comparison, not a static template. Every number
 * here is computed by re-running the same underlying queries over two
 * 7-day windows (this week vs. the week before) - there's no separate
 * "weekly snapshot" table to drift out of sync with the live data.
 */
export async function getWeeklyBrief(organizationId: string): Promise<WeeklyBrief> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [employees, usageThisWeek, usageLastWeek, lessonsThisWeek, lessonsLastWeek, fluencyAll, newlyAdopted, totalEmployees] =
    await Promise.all([
      prisma.employee.findMany({ where: { organizationId }, select: { id: true, department: { select: { name: true } } } }),
      prisma.aIUsageEvent.findMany({ where: { organizationId, createdAt: { gte: oneWeekAgo } }, select: { employeeId: true } }),
      prisma.aIUsageEvent.findMany({
        where: { organizationId, createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
        select: { employeeId: true },
      }),
      prisma.lessonCompletion.findMany({
        where: { employee: { organizationId }, completedAt: { gte: oneWeekAgo } },
        select: { employeeId: true },
      }),
      prisma.lessonCompletion.count({
        where: { employee: { organizationId }, completedAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
      }),
      prisma.assessment.findMany({
        where: { organizationId, type: "EMPLOYEE", status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        distinct: ["employeeId"],
        select: { employeeId: true, overallScore: true, completedAt: true },
      }),
      prisma.organizationWorkflow.findMany({
        where: { organizationId, adoptedAt: { gte: oneWeekAgo } },
        include: { workflow: { select: { id: true, title: true } } },
      }),
      prisma.employee.count({ where: { organizationId } }),
    ]);

  const activeThisWeekIds = new Set([...usageThisWeek.map((e) => e.employeeId), ...lessonsThisWeek.map((l) => l.employeeId)].filter(Boolean) as string[]);
  const activeLastWeekIds = new Set(usageLastWeek.map((e) => e.employeeId).filter(Boolean) as string[]);

  const scoresNow = fluencyAll.filter((a) => a.overallScore !== null);
  const scoresLastWeek = fluencyAll.filter((a) => a.overallScore !== null && a.completedAt && a.completedAt < oneWeekAgo);
  const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

  const deptByEmployee = new Map(employees.map((e) => [e.id, e.department?.name ?? null]));
  const deptCounts = new Map<string, { thisWeek: number; lastWeek: number }>();
  for (const id of activeThisWeekIds) {
    const dept = deptByEmployee.get(id);
    if (!dept) continue;
    const entry = deptCounts.get(dept) ?? { thisWeek: 0, lastWeek: 0 };
    entry.thisWeek += 1;
    deptCounts.set(dept, entry);
  }
  for (const id of activeLastWeekIds) {
    const dept = deptByEmployee.get(id);
    if (!dept) continue;
    const entry = deptCounts.get(dept) ?? { thisWeek: 0, lastWeek: 0 };
    entry.lastWeek += 1;
    deptCounts.set(dept, entry);
  }
  let fastestGrowingDepartment: WeeklyBrief["fastestGrowingDepartment"] = null;
  for (const [name, { thisWeek, lastWeek }] of deptCounts) {
    const delta = thisWeek - lastWeek;
    if (delta > 0 && (!fastestGrowingDepartment || delta > fastestGrowingDepartment.delta)) {
      fastestGrowingDepartment = { name, activeThisWeek: thisWeek, delta };
    }
  }

  const newlyAdoptedWorkflowIds = newlyAdopted.map((ow) => ow.workflowId);
  const valueCapturedThisWeek = newlyAdoptedWorkflowIds.length
    ? await prisma.opportunity
        .aggregate({ where: { organizationId, workflowId: { in: newlyAdoptedWorkflowIds } }, _sum: { estAnnualValue: true } })
        .then((r) => r._sum.estAnnualValue ?? 0)
    : 0;

  return {
    activeUsersThisWeek: activeThisWeekIds.size,
    activeUsersLastWeek: activeLastWeekIds.size,
    totalEmployees,
    fluencyNow: avg(scoresNow.map((a) => a.overallScore!)),
    fluencyLastWeek: avg(scoresLastWeek.map((a) => a.overallScore!)),
    lessonsCompletedThisWeek: lessonsThisWeek.length,
    lessonsCompletedLastWeek: lessonsLastWeek,
    workflowsNewlyAdopted: newlyAdopted.map((ow) => ({ id: ow.workflow.id, title: ow.workflow.title })),
    valueCapturedThisWeek,
    fastestGrowingDepartment,
  };
}
