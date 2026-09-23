import "server-only";
import { prisma } from "@/lib/prisma";
import { getEligibleEmployeesForWorkflow } from "@/lib/queries/workflowDeployment";

export type WorkflowReadiness = {
  totalLessons: number;
  estimatedMinutesPerEmployee: number;
  eligibleEmployees: number;
  readyCount: number;
  employeesNeedingTraining: { id: string; name: string }[];
};

/**
 * "Is the team ready to adopt this workflow?" - an employee is "ready" once
 * they've completed every lesson in every course linked to the workflow.
 * When a workflow has no linked course, there's nothing to be ready for, so
 * totalLessons is 0 and every eligible employee counts as ready.
 */
export async function getWorkflowReadiness(organizationId: string, workflowId: string, department: string): Promise<WorkflowReadiness> {
  const [courses, eligibleEmployees] = await Promise.all([
    prisma.course.findMany({ where: { workflowId }, include: { lessons: true } }),
    getEligibleEmployeesForWorkflow(organizationId, department),
  ]);

  const lessons = courses.flatMap((c) => c.lessons);
  const lessonIds = lessons.map((l) => l.id);
  const estimatedMinutesPerEmployee = lessons.reduce((sum, l) => sum + l.durationMin, 0);

  if (lessonIds.length === 0) {
    return {
      totalLessons: 0,
      estimatedMinutesPerEmployee: 0,
      eligibleEmployees: eligibleEmployees.length,
      readyCount: eligibleEmployees.length,
      employeesNeedingTraining: [],
    };
  }

  const employeeIds = eligibleEmployees.map((e) => e.id);
  const completions =
    employeeIds.length > 0
      ? await prisma.lessonCompletion.groupBy({
          by: ["employeeId"],
          where: { employeeId: { in: employeeIds }, lessonId: { in: lessonIds } },
          _count: { _all: true },
        })
      : [];
  const completedCountByEmployee = new Map(completions.map((c) => [c.employeeId, c._count._all]));

  const employeesNeedingTraining = eligibleEmployees
    .filter((e) => (completedCountByEmployee.get(e.id) ?? 0) < lessonIds.length)
    .map((e) => ({ id: e.id, name: e.user.name }));

  return {
    totalLessons: lessonIds.length,
    estimatedMinutesPerEmployee,
    eligibleEmployees: eligibleEmployees.length,
    readyCount: eligibleEmployees.length - employeesNeedingTraining.length,
    employeesNeedingTraining,
  };
}
