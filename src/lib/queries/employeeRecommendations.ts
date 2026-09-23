import "server-only";
import { prisma } from "@/lib/prisma";
import { getFluencyForEmployee, getWeakestSkill } from "@/lib/queries/fluency";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export type EmployeeRecommendation = {
  id: string;
  title: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
  estimatedMinutes?: number;
};

/**
 * "What should I do next?" for one employee - each recommendation is a
 * specific, real resource (a named lesson, workflow, or simulation) they
 * haven't completed yet, never a generic "take some training" nudge.
 */
export async function getEmployeeRecommendations(employeeId: string): Promise<EmployeeRecommendation[]> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { department: true } });
  if (!employee) return [];

  const recommendations: EmployeeRecommendation[] = [];
  const fluency = await getFluencyForEmployee(employeeId);

  if (!fluency) {
    recommendations.push({
      id: "take-assessment",
      title: "Complete your AI skills assessment",
      reason: "You haven't completed an AI skills assessment yet - this personalizes everything else you see here.",
      actionLabel: "Take assessment",
      actionHref: "/dashboard/assessment",
    });
  } else if (employee.department) {
    const weakest = getWeakestSkill(fluency.breakdown);
    const completedLessonIds = new Set(
      (await prisma.lessonCompletion.findMany({ where: { employeeId }, select: { lessonId: true } })).map((l) => l.lessonId)
    );
    const courses = await prisma.course.findMany({
      where: { department: employee.department.name },
      include: { lessons: { orderBy: { order: "asc" } } },
    });
    const nextLesson = courses.flatMap((c) => c.lessons).find((l) => !completedLessonIds.has(l.id));

    if (nextLesson) {
      recommendations.push({
        id: `lesson-${nextLesson.id}`,
        title: nextLesson.title,
        reason: `Your biggest opportunity is ${weakest === "workflowDesign" ? "workflow design" : weakest}. This lesson builds on that.`,
        actionLabel: "Start lesson",
        actionHref: `/dashboard/learn/lessons/${nextLesson.id}`,
        estimatedMinutes: nextLesson.durationMin,
      });
    }
  }

  if (employee.department) {
    const usedWorkflowIds = new Set(
      (
        await prisma.workflowStepCompletion.findMany({
          where: { employeeId },
          select: { workflowStep: { select: { workflowId: true } } },
        })
      ).map((s) => s.workflowStep.workflowId)
    );

    const deployedWorkflows = await prisma.organizationWorkflow.findMany({
      where: { organizationId: employee.organizationId, status: { in: DEPLOYED_STATUSES } },
      include: { workflow: true },
    });
    const nextWorkflow = deployedWorkflows.find(
      (ow) => ow.workflow.department === employee.department!.name && !usedWorkflowIds.has(ow.workflowId)
    );

    if (nextWorkflow) {
      recommendations.push({
        id: `workflow-${nextWorkflow.workflowId}`,
        title: `Activate ${nextWorkflow.workflow.title}`,
        reason: `Your team has adopted this workflow, but you haven't used it yet.`,
        actionLabel: "View workflow",
        actionHref: `/dashboard/workflows/${nextWorkflow.workflowId}`,
      });
    }
  }

  if (employee.department) {
    const attemptedSimIds = new Set(
      (await prisma.simulationAttempt.findMany({ where: { employeeId }, select: { simulationId: true } })).map((a) => a.simulationId)
    );
    const nextSimulation = await prisma.simulation.findFirst({
      where: { department: employee.department.name, id: { notIn: Array.from(attemptedSimIds) } },
    });
    if (nextSimulation) {
      recommendations.push({
        id: `simulation-${nextSimulation.id}`,
        title: `Practice: ${nextSimulation.title}`,
        reason: "A realistic scenario for your role you haven't tried yet.",
        actionLabel: "Start simulation",
        actionHref: `/dashboard/learn/simulations/${nextSimulation.id}`,
      });
    }
  }

  return recommendations.slice(0, 3);
}
