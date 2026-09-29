"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { HIDEABLE_LABEL, type HideableType } from "@/lib/queries/hidden";

/** Confirms the id is a shared-catalog row (not another org's private content) and returns its display title. */
async function catalogTitle(type: HideableType, id: string): Promise<string | null> {
  switch (type) {
    case "WORKFLOW":
      return (await prisma.workflow.findFirst({ where: { id, organizationId: null }, select: { title: true } }))?.title ?? null;
    case "COURSE":
      return (await prisma.course.findFirst({ where: { id, organizationId: null }, select: { title: true } }))?.title ?? null;
    case "TOOL":
      return (await prisma.tool.findFirst({ where: { id, organizationId: null }, select: { name: true } }))?.name ?? null;
    case "SIMULATION":
      return (await prisma.simulation.findUnique({ where: { id }, select: { title: true } }))?.title ?? null;
    case "TEMPLATE":
      return (await prisma.workflowStep.findFirst({ where: { id, workflow: { organizationId: null } }, select: { title: true } }))?.title ?? null;
    default:
      return null;
  }
}

/**
 * "Deleting" shared-catalog content for one organization. The rows stay
 * (every other organization still uses them); this org just stops seeing
 * them. Reversible from Settings.
 */
export async function removeCatalogItem(type: HideableType, id: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;
  if (!(type in HIDEABLE_LABEL)) throw new Error("Unknown content type.");

  const title = await catalogTitle(type, id);
  if (!title) throw new Error("Item not found.");

  await prisma.hiddenContent.upsert({
    where: { organizationId_entityType_entityId: { organizationId, entityType: type, entityId: id } },
    update: {},
    create: { organizationId, entityType: type, entityId: id, hiddenByName: session.name },
  });

  // A removed workflow shouldn't keep counting toward this org's adoption stats.
  if (type === "WORKFLOW") {
    await prisma.organizationWorkflow.deleteMany({ where: { organizationId, workflowId: id } });
  }

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "content.deleted",
    entityType: HIDEABLE_LABEL[type],
    entityId: id,
    metadata: { title, catalog: true },
  });

  revalidatePath("/dashboard", "layout");
}

export async function restoreCatalogItem(hiddenId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;
  const row = await prisma.hiddenContent.findUnique({ where: { id: hiddenId } });
  if (!row || row.organizationId !== organizationId) throw new Error("Item not found.");

  await prisma.hiddenContent.delete({ where: { id: hiddenId } });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "content.restored",
    entityType: HIDEABLE_LABEL[row.entityType as HideableType] ?? row.entityType,
    entityId: row.entityId,
  });

  revalidatePath("/dashboard", "layout");
}
