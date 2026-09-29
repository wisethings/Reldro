import "server-only";
import { prisma } from "@/lib/prisma";

export type HideableType = "WORKFLOW" | "COURSE" | "TOOL" | "SIMULATION" | "TEMPLATE";

export const HIDEABLE_LABEL: Record<HideableType, string> = {
  WORKFLOW: "Workflow",
  COURSE: "Course",
  TOOL: "Tool",
  SIMULATION: "Simulation",
  TEMPLATE: "Template",
};

/** Ids of shared-catalog items this org has removed. Spread into a Prisma `where` as `id: { notIn }`. */
export async function getHiddenIds(organizationId: string, type: HideableType): Promise<string[]> {
  const rows = await prisma.hiddenContent.findMany({ where: { organizationId, entityType: type }, select: { entityId: true } });
  return rows.map((r) => r.entityId);
}

export async function getAllHiddenIds(organizationId: string): Promise<Record<HideableType, string[]>> {
  const rows = await prisma.hiddenContent.findMany({ where: { organizationId }, select: { entityType: true, entityId: true } });
  const out: Record<HideableType, string[]> = { WORKFLOW: [], COURSE: [], TOOL: [], SIMULATION: [], TEMPLATE: [] };
  for (const r of rows) out[r.entityType as HideableType]?.push(r.entityId);
  return out;
}

/** Removed catalog items with display titles, for the admin's Restore list. */
export async function getHiddenItems(organizationId: string) {
  const rows = await prisma.hiddenContent.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  const idsOf = (t: HideableType) => rows.filter((r) => r.entityType === t).map((r) => r.entityId);
  const [workflows, courses, tools, sims, steps] = await Promise.all([
    prisma.workflow.findMany({ where: { id: { in: idsOf("WORKFLOW") } }, select: { id: true, title: true } }),
    prisma.course.findMany({ where: { id: { in: idsOf("COURSE") } }, select: { id: true, title: true } }),
    prisma.tool.findMany({ where: { id: { in: idsOf("TOOL") } }, select: { id: true, name: true } }),
    prisma.simulation.findMany({ where: { id: { in: idsOf("SIMULATION") } }, select: { id: true, title: true } }),
    prisma.workflowStep.findMany({ where: { id: { in: idsOf("TEMPLATE") } }, select: { id: true, title: true } }),
  ]);
  const titles = new Map<string, string>([
    ...workflows.map((x): [string, string] => [x.id, x.title]),
    ...courses.map((x): [string, string] => [x.id, x.title]),
    ...tools.map((x): [string, string] => [x.id, x.name]),
    ...sims.map((x): [string, string] => [x.id, x.title]),
    ...steps.map((x): [string, string] => [x.id, x.title]),
  ]);
  return rows.map((r) => ({
    id: r.id,
    type: r.entityType as HideableType,
    title: titles.get(r.entityId) ?? "(no longer in catalog)",
    hiddenByName: r.hiddenByName,
    createdAt: r.createdAt,
  }));
}
