import "server-only";
import { prisma } from "@/lib/prisma";
import { getRealAdoptionMetrics } from "@/lib/queries/adoption";
import { getOrgValueCapture } from "@/lib/queries/value";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export type AdoptionFunnelStage = { label: string; count: number };

/**
 * The real AI adoption journey, stage by stage, all computed from actual
 * activity - no stage is estimated or backfilled. Each stage is a strict
 * narrowing of "employees who did X," so counts should only ever go down
 * (or stay flat) left to right.
 */
export async function getAdoptionFunnel(organizationId: string): Promise<{ stages: AdoptionFunnelStage[]; annualizedValue: number }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [metrics, completedTraining, usingWorkflows, consistentUsers, deployedWorkflows, valueCapture] = await Promise.all([
    getRealAdoptionMetrics(organizationId),
    prisma.lessonCompletion.findMany({
      where: { employee: { organizationId } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.workflowStepCompletion.findMany({
      where: { employee: { organizationId } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.workflowStepCompletion.findMany({
      where: { employee: { organizationId }, completedAt: { gte: thirtyDaysAgo } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    }),
    prisma.organizationWorkflow.findMany({
      where: { organizationId, status: { in: DEPLOYED_STATUSES } },
      select: { workflowId: true },
    }),
    getOrgValueCapture(organizationId),
  ]);

  const deployedWorkflowIds = deployedWorkflows.map((w) => w.workflowId);
  const generatingValue = deployedWorkflowIds.length
    ? await prisma.workflowStepCompletion.findMany({
        where: { employee: { organizationId }, workflowStep: { workflowId: { in: deployedWorkflowIds } } },
        select: { employeeId: true },
        distinct: ["employeeId"],
      })
    : [];

  return {
    stages: [
      { label: "Employees", count: metrics.totalUsers },
      { label: "Using AI (active last 30 days)", count: metrics.activeUsers },
      { label: "Completed AI training", count: completedTraining.length },
      { label: "Using an AI workflow", count: usingWorkflows.length },
      { label: "Using workflows consistently (last 30 days)", count: consistentUsers.length },
      { label: "Generating measurable value", count: generatingValue.length },
    ],
    annualizedValue: valueCapture.capturedValue,
  };
}
