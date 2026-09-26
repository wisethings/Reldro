import "server-only";
import { prisma } from "@/lib/prisma";
import type { WorkflowAdoptionStatus } from "@prisma/client";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export type WorkflowDeploymentStats = {
  status: WorkflowAdoptionStatus;
  ownerName: string | null;
  eligibleEmployees: number;
  activeAdopters: number;
  adoptionPct: number;
  hoursSavedMonthly: number;
  estAnnualValue: number | null;
  capturedValue: number;
  completionRatePct: number;
  lastActivityAt: Date | null;
};

/**
 * Real deployment stats for every catalog workflow, for a given org, in one
 * batched pass (no N+1 queries per card). "Eligible employees" is the org's
 * headcount in the workflow's department when that department exists for
 * this org, otherwise the whole org. "Completion rate" is how thoroughly
 * adopters go through the workflow's steps (completions / (adopters x total
 * steps)) - a real signal, not a fabricated "AI output quality" score which
 * nothing in the product actually measures.
 */
export async function getWorkflowDeploymentStatsForOrg(
  organizationId: string,
  workflows: { id: string; department: string; steps: { id: string }[] }[]
): Promise<Map<string, WorkflowDeploymentStats>> {
  const workflowIds = workflows.map((w) => w.id);
  if (workflowIds.length === 0) return new Map();

  const [orgWorkflows, opportunities, departments, totalOrgEmployees, stepCompletions] = await Promise.all([
    prisma.organizationWorkflow.findMany({
      where: { organizationId, workflowId: { in: workflowIds } },
      include: { owner: { include: { user: true } } },
    }),
    prisma.opportunity.findMany({
      where: { organizationId, workflowId: { in: workflowIds } },
      select: { workflowId: true, estAnnualValue: true, estHoursSavedMonthly: true },
    }),
    prisma.department.findMany({
      where: { organizationId },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.employee.count({ where: { organizationId } }),
    // Workflows are frequently the shared global catalog, so without the
    // employee.organizationId filter this pulled every org's completions of
    // a shared workflow, diluting/inflating this org's adoption and
    // per-employee value-attribution numbers with other orgs' activity.
    prisma.workflowStepCompletion.findMany({
      where: { workflowStep: { workflowId: { in: workflowIds } }, employee: { organizationId } },
      select: { employeeId: true, completedAt: true, workflowStep: { select: { workflowId: true } } },
    }),
  ]);

  const orgWorkflowByWorkflowId = new Map(orgWorkflows.map((ow) => [ow.workflowId, ow]));
  const opportunityByWorkflowId = new Map(opportunities.map((o) => [o.workflowId!, o]));
  const employeeCountByDeptName = new Map(departments.map((d) => [d.name, d._count.employees]));

  const completionsByWorkflow = new Map<string, { employeeIds: Set<string>; count: number; latest: Date | null }>();
  for (const c of stepCompletions) {
    const wid = c.workflowStep.workflowId;
    const entry = completionsByWorkflow.get(wid) ?? { employeeIds: new Set<string>(), count: 0, latest: null };
    entry.employeeIds.add(c.employeeId);
    entry.count += 1;
    if (!entry.latest || c.completedAt > entry.latest) entry.latest = c.completedAt;
    completionsByWorkflow.set(wid, entry);
  }

  const result = new Map<string, WorkflowDeploymentStats>();
  for (const w of workflows) {
    const orgWorkflow = orgWorkflowByWorkflowId.get(w.id);
    const status: WorkflowAdoptionStatus = orgWorkflow?.status ?? "NOT_ADOPTED";
    const opportunity = opportunityByWorkflowId.get(w.id);
    const completions = completionsByWorkflow.get(w.id);

    const eligibleEmployees = employeeCountByDeptName.get(w.department) ?? totalOrgEmployees;
    const activeAdopters = completions?.employeeIds.size ?? 0;
    const adoptionPct = eligibleEmployees > 0 ? Math.round((activeAdopters / eligibleEmployees) * 100) : 0;
    const totalSteps = w.steps.length;
    const completionRatePct =
      activeAdopters > 0 && totalSteps > 0
        ? Math.min(100, Math.round(((completions?.count ?? 0) / (activeAdopters * totalSteps)) * 100))
        : 0;

    const isDeployed = DEPLOYED_STATUSES.includes(status);

    result.set(w.id, {
      status,
      ownerName: orgWorkflow?.owner?.user.name ?? null,
      eligibleEmployees,
      activeAdopters,
      adoptionPct,
      hoursSavedMonthly: isDeployed ? opportunity?.estHoursSavedMonthly ?? 0 : 0,
      estAnnualValue: opportunity?.estAnnualValue ?? null,
      capturedValue: isDeployed ? opportunity?.estAnnualValue ?? 0 : 0,
      completionRatePct,
      lastActivityAt: completions?.latest ?? null,
    });
  }

  return result;
}

export async function getWorkflowDeploymentStats(
  organizationId: string,
  workflow: { id: string; department: string; steps: { id: string }[] }
): Promise<WorkflowDeploymentStats> {
  const map = await getWorkflowDeploymentStatsForOrg(organizationId, [workflow]);
  return (
    map.get(workflow.id) ?? {
      status: "NOT_ADOPTED",
      ownerName: null,
      eligibleEmployees: 0,
      activeAdopters: 0,
      adoptionPct: 0,
      hoursSavedMonthly: 0,
      estAnnualValue: null,
      capturedValue: 0,
      completionRatePct: 0,
      lastActivityAt: null,
    }
  );
}

/** Eligible employees for a workflow (COMPANY_ADMIN owner picker). */
export async function getEligibleEmployeesForWorkflow(organizationId: string, department: string) {
  const dept = await prisma.department.findFirst({ where: { organizationId, name: department } });
  return prisma.employee.findMany({
    where: { organizationId, departmentId: dept?.id ?? undefined },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}
