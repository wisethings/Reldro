import "server-only";
import { prisma } from "@/lib/prisma";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export type ValueCapture = {
  potentialValue: number;
  capturedValue: number;
  remainingValue: number;
  captureRatePct: number;
};

/**
 * Potential vs. captured AI value, computed from real state rather than a
 * separate estimate: potential is the sum of estimated annual value across
 * every non-deferred opportunity; captured is the subset of that whose
 * linked workflow the org has actually adopted (OrganizationWorkflow.status
 * === "ADOPTED"). This is the same "has the org adopted the workflow behind
 * this opportunity" signal getRealAdoptionMetrics uses for hours saved, just
 * expressed as a full potential/captured/remaining breakdown instead of a
 * single number.
 */
export async function getOrgValueCapture(organizationId: string): Promise<ValueCapture> {
  const [opportunities, adoptedWorkflows] = await Promise.all([
    prisma.opportunity.findMany({
      where: { organizationId, status: { not: "DEFERRED" } },
      select: { estAnnualValue: true, workflowId: true },
    }),
    prisma.organizationWorkflow.findMany({
      where: { organizationId, status: { in: DEPLOYED_STATUSES } },
      select: { workflowId: true },
    }),
  ]);

  const adoptedWorkflowIds = new Set(adoptedWorkflows.map((w) => w.workflowId));

  let potentialValue = 0;
  let capturedValue = 0;
  for (const o of opportunities) {
    potentialValue += o.estAnnualValue;
    if (o.workflowId && adoptedWorkflowIds.has(o.workflowId)) capturedValue += o.estAnnualValue;
  }

  const remainingValue = potentialValue - capturedValue;
  const captureRatePct = potentialValue > 0 ? Math.round((capturedValue / potentialValue) * 100) : 0;

  return { potentialValue, capturedValue, remainingValue, captureRatePct };
}

export type DepartmentValueCapture = { department: string } & ValueCapture;

export async function getDepartmentValueCapture(organizationId: string): Promise<DepartmentValueCapture[]> {
  const [opportunities, adoptedWorkflows] = await Promise.all([
    prisma.opportunity.findMany({
      where: { organizationId, status: { not: "DEFERRED" } },
      select: { estAnnualValue: true, workflowId: true, department: { select: { name: true } } },
    }),
    prisma.organizationWorkflow.findMany({
      where: { organizationId, status: { in: DEPLOYED_STATUSES } },
      select: { workflowId: true },
    }),
  ]);
  const adoptedWorkflowIds = new Set(adoptedWorkflows.map((w) => w.workflowId));

  const byDept = new Map<string, { potentialValue: number; capturedValue: number }>();
  for (const o of opportunities) {
    const name = o.department?.name ?? "Cross-functional";
    const entry = byDept.get(name) ?? { potentialValue: 0, capturedValue: 0 };
    entry.potentialValue += o.estAnnualValue;
    if (o.workflowId && adoptedWorkflowIds.has(o.workflowId)) entry.capturedValue += o.estAnnualValue;
    byDept.set(name, entry);
  }

  return Array.from(byDept.entries())
    .map(([department, { potentialValue, capturedValue }]) => ({
      department,
      potentialValue,
      capturedValue,
      remainingValue: potentialValue - capturedValue,
      captureRatePct: potentialValue > 0 ? Math.round((capturedValue / potentialValue) * 100) : 0,
    }))
    .sort((a, b) => b.potentialValue - a.potentialValue);
}
