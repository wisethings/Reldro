import "server-only";
import { prisma } from "@/lib/prisma";

export type EmployeeActivity = {
  lessonsCompleted: number;
  lastActiveAt: Date | null;
};

/**
 * Real per-employee activity for manager/admin rollup views: lessons
 * completed and the most recent real signal (a usage event or a lesson
 * completion) - this is what makes a roster page an accountability tool
 * instead of just a name list.
 */
export async function getEmployeeActivity(employeeIds: string[]): Promise<Map<string, EmployeeActivity>> {
  const map = new Map<string, EmployeeActivity>();
  if (employeeIds.length === 0) return map;

  const [lessonCounts, lastLessons, lastUsageEvents] = await Promise.all([
    prisma.lessonCompletion.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds } },
      _count: { _all: true },
    }),
    prisma.lessonCompletion.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds } },
      _max: { completedAt: true },
    }),
    prisma.aIUsageEvent.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds } },
      _max: { createdAt: true },
    }),
  ]);

  const lessonCountById = new Map(lessonCounts.map((r) => [r.employeeId, r._count._all]));
  const lastLessonById = new Map(lastLessons.map((r) => [r.employeeId, r._max.completedAt]));
  const lastUsageById = new Map(lastUsageEvents.map((r) => [r.employeeId as string, r._max.createdAt]));

  for (const id of employeeIds) {
    const lastLesson = lastLessonById.get(id) ?? null;
    const lastUsage = lastUsageById.get(id) ?? null;
    const lastActiveAt =
      lastLesson && lastUsage ? (lastLesson > lastUsage ? lastLesson : lastUsage) : lastLesson ?? lastUsage ?? null;
    map.set(id, { lessonsCompleted: lessonCountById.get(id) ?? 0, lastActiveAt });
  }

  return map;
}

export type EmployeeEngagement = { aiActivityCount30d: number; workflowStepsCompleted: number };

/** Real signals used to flag "high AI activity but low workflow adoption" (see teamInsights.ts). */
export async function getEmployeeEngagement(employeeIds: string[]): Promise<Map<string, EmployeeEngagement>> {
  const map = new Map<string, EmployeeEngagement>();
  if (employeeIds.length === 0) return map;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [activityCounts, stepCounts] = await Promise.all([
    prisma.aIUsageEvent.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds }, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    prisma.workflowStepCompletion.groupBy({
      by: ["employeeId"],
      where: { employeeId: { in: employeeIds } },
      _count: { _all: true },
    }),
  ]);

  const activityById = new Map(activityCounts.map((r) => [r.employeeId as string, r._count._all]));
  const stepsById = new Map(stepCounts.map((r) => [r.employeeId, r._count._all]));

  for (const id of employeeIds) {
    map.set(id, { aiActivityCount30d: activityById.get(id) ?? 0, workflowStepsCompleted: stepsById.get(id) ?? 0 });
  }
  return map;
}
