import "server-only";
import { prisma } from "@/lib/prisma";

export async function getToolUsageBreakdown(organizationId: string) {
  const grouped = await prisma.aIUsageEvent.groupBy({
    by: ["tool"],
    where: { organizationId },
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ label: g.tool, value: g._count._all }))
    .sort((a, b) => b.value - a.value);
}

export async function getWorkflowAdoptionBreakdown(organizationId: string) {
  const grouped = await prisma.organizationWorkflow.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: { _all: true },
  });
  return grouped.map((g) => ({ status: g.status, count: g._count._all }));
}

export async function getTrainingCompletionRate(organizationId: string) {
  const [employeesByDept, coursesByDept, completions] = await Promise.all([
    prisma.employee.groupBy({ by: ["departmentId"], where: { organizationId }, _count: { _all: true } }),
    // A course is either the shared global catalog (organizationId null) or
    // a team-authored one scoped to its own org - without this filter every
    // org's private course lessons were counted into every other org's
    // "possible" denominator, permanently deflating their completion rate.
    prisma.course.findMany({ where: { OR: [{ organizationId: null }, { organizationId }] }, include: { lessons: true } }),
    prisma.lessonCompletion.count({ where: { employee: { organizationId } } }),
  ]);

  const departments = await prisma.department.findMany({ where: { organizationId } });
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  const lessonsByDeptName = new Map<string, number>();
  for (const course of coursesByDept) {
    lessonsByDeptName.set(course.department, (lessonsByDeptName.get(course.department) ?? 0) + course.lessons.length);
  }

  let possible = 0;
  for (const group of employeesByDept) {
    const deptName = group.departmentId ? deptNameById.get(group.departmentId) : undefined;
    const lessons = deptName ? lessonsByDeptName.get(deptName) ?? 0 : 0;
    possible += group._count._all * lessons;
  }

  return possible > 0 ? Math.round((completions / possible) * 100) : 0;
}
