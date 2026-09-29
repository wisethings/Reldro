import "server-only";
import { prisma } from "@/lib/prisma";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";
import { getHiddenIds } from "@/lib/queries/hidden";

export type RelatedWorkflowSummary = { id: string; title: string; department: string };
export type DependencyStatus = RelatedWorkflowSummary & { met: boolean };

/** Workflows an admin/lead has linked to this one for context - never gates anything. */
export async function getLinkedWorkflows(organizationId: string, workflowId: string): Promise<RelatedWorkflowSummary[]> {
  const links = await prisma.workflowLink.findMany({
    where: { organizationId, workflowId },
    include: { linkedWorkflow: { select: { id: true, title: true, department: true } } },
    orderBy: { linkedWorkflow: { title: "asc" } },
  });
  return links.map((l) => l.linkedWorkflow);
}

/** Prerequisites this workflow has, each flagged with whether this org has already adopted it. */
export async function getWorkflowDependencies(organizationId: string, workflowId: string): Promise<DependencyStatus[]> {
  const deps = await prisma.workflowDependency.findMany({
    where: { organizationId, workflowId },
    include: { dependsOnWorkflow: { select: { id: true, title: true, department: true } } },
    orderBy: { dependsOnWorkflow: { title: "asc" } },
  });
  if (deps.length === 0) return [];

  const statuses = await prisma.organizationWorkflow.findMany({
    where: { organizationId, workflowId: { in: deps.map((d) => d.dependsOnWorkflowId) } },
    select: { workflowId: true, status: true },
  });
  const statusByWorkflowId = new Map(statuses.map((s) => [s.workflowId, s.status]));

  return deps.map((d) => ({
    ...d.dependsOnWorkflow,
    met: DEPLOYED_STATUSES.includes(statusByWorkflowId.get(d.dependsOnWorkflowId) ?? "NOT_ADOPTED"),
  }));
}

/** The reverse view: other workflows that name this one as a prerequisite. */
export async function getDependentWorkflows(organizationId: string, workflowId: string): Promise<RelatedWorkflowSummary[]> {
  const deps = await prisma.workflowDependency.findMany({
    where: { organizationId, dependsOnWorkflowId: workflowId },
    include: { workflow: { select: { id: true, title: true, department: true } } },
    orderBy: { workflow: { title: "asc" } },
  });
  return deps.map((d) => d.workflow);
}

/**
 * True if this workflow has a prerequisite this org hasn't adopted yet -
 * the actual gate `adoptWorkflow`/`setWorkflowStage` check before letting a
 * workflow move to an adopted-or-later stage.
 */
export async function hasUnmetDependencies(organizationId: string, workflowId: string): Promise<boolean> {
  const deps = await getWorkflowDependencies(organizationId, workflowId);
  return deps.some((d) => !d.met);
}

/** Every workflow visible to this org (global catalog + its own), for populating a link/dependency picker. */
export async function getWorkflowChoices(organizationId: string, excludeWorkflowId: string): Promise<RelatedWorkflowSummary[]> {
  return prisma.workflow.findMany({
    where: { OR: [{ organizationId: null }, { organizationId }], id: { not: excludeWorkflowId, notIn: await getHiddenIds(organizationId, "WORKFLOW") } },
    select: { id: true, title: true, department: true },
    orderBy: [{ department: "asc" }, { title: "asc" }],
  });
}
