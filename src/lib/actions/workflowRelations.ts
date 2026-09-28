"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

/**
 * Same boundary as requireWorkflowAuthor/requireTemplateAuthor: a company
 * admin can touch any workflow's related/prerequisite workflows, a
 * department admin only for a workflow in their own department. This is a
 * planning/authoring action (like editing a workflow's content), not a
 * deployment action, so it doesn't extend to a workflow's owner/assignee the
 * way checklist/assignee changes do.
 */
async function requireWorkflowRelationsManager(workflowId: string) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const organizationId = session.organizationId;

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, OR: [{ organizationId: null }, { organizationId }] },
    select: { department: true },
  });
  if (!workflow) throw new Error("Workflow not found.");

  if (session.role !== "COMPANY_ADMIN") {
    const employee = session.employeeId
      ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
      : null;
    if (!(employee?.isDepartmentAdmin && employee.department?.name === workflow.department)) {
      throw new Error("Only a company admin or this workflow's department lead can change its related or prerequisite workflows.");
    }
  }

  return { session, organizationId };
}

/** Confirms a workflow id is actually visible to this org before linking to it - otherwise an org could probe for another org's private workflow ids. */
async function assertWorkflowVisible(organizationId: string, workflowId: string) {
  const target = await prisma.workflow.findFirst({
    where: { id: workflowId, OR: [{ organizationId: null }, { organizationId }] },
    select: { id: true },
  });
  if (!target) throw new Error("Workflow not found.");
}

export async function addWorkflowLink(workflowId: string, linkedWorkflowId: string) {
  const { session, organizationId } = await requireWorkflowRelationsManager(workflowId);
  if (workflowId === linkedWorkflowId) throw new Error("A workflow can't be linked to itself.");
  await assertWorkflowVisible(organizationId, linkedWorkflowId);

  // Undirected - store both directions so the link shows on either workflow's page without an OR query.
  await prisma.$transaction([
    prisma.workflowLink.upsert({
      where: { organizationId_workflowId_linkedWorkflowId: { organizationId, workflowId, linkedWorkflowId } },
      update: {},
      create: { organizationId, workflowId, linkedWorkflowId },
    }),
    prisma.workflowLink.upsert({
      where: { organizationId_workflowId_linkedWorkflowId: { organizationId, workflowId: linkedWorkflowId, linkedWorkflowId: workflowId } },
      update: {},
      create: { organizationId, workflowId: linkedWorkflowId, linkedWorkflowId: workflowId },
    }),
  ]);

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.linked",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { linkedWorkflowId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath(`/dashboard/workflows/${linkedWorkflowId}`);
}

export async function removeWorkflowLink(workflowId: string, linkedWorkflowId: string) {
  const { session, organizationId } = await requireWorkflowRelationsManager(workflowId);

  await prisma.workflowLink.deleteMany({
    where: {
      organizationId,
      OR: [
        { workflowId, linkedWorkflowId },
        { workflowId: linkedWorkflowId, linkedWorkflowId: workflowId },
      ],
    },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.unlinked",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { linkedWorkflowId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath(`/dashboard/workflows/${linkedWorkflowId}`);
}

/**
 * Walks forward along existing "depends on" edges from `dependsOnWorkflowId`
 * looking for `workflowId` - if found, `dependsOnWorkflowId` already
 * (transitively) depends on `workflowId`, so adding the reverse edge would
 * close a cycle neither workflow could ever get out of (each waiting on the
 * other to adopt first).
 */
async function wouldCreateCycle(organizationId: string, workflowId: string, dependsOnWorkflowId: string): Promise<boolean> {
  if (workflowId === dependsOnWorkflowId) return true;

  const visited = new Set<string>([dependsOnWorkflowId]);
  let frontier = [dependsOnWorkflowId];
  while (frontier.length > 0) {
    const edges = await prisma.workflowDependency.findMany({
      where: { organizationId, workflowId: { in: frontier } },
      select: { dependsOnWorkflowId: true },
    });
    const next: string[] = [];
    for (const edge of edges) {
      if (edge.dependsOnWorkflowId === workflowId) return true;
      if (!visited.has(edge.dependsOnWorkflowId)) {
        visited.add(edge.dependsOnWorkflowId);
        next.push(edge.dependsOnWorkflowId);
      }
    }
    frontier = next;
  }
  return false;
}

export async function addWorkflowDependency(workflowId: string, dependsOnWorkflowId: string) {
  const { session, organizationId } = await requireWorkflowRelationsManager(workflowId);
  if (workflowId === dependsOnWorkflowId) throw new Error("A workflow can't depend on itself.");
  await assertWorkflowVisible(organizationId, dependsOnWorkflowId);

  if (await wouldCreateCycle(organizationId, workflowId, dependsOnWorkflowId)) {
    throw new Error("That would create a circular dependency between these workflows.");
  }

  await prisma.workflowDependency.upsert({
    where: { organizationId_workflowId_dependsOnWorkflowId: { organizationId, workflowId, dependsOnWorkflowId } },
    update: {},
    create: { organizationId, workflowId, dependsOnWorkflowId },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.dependency_added",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { dependsOnWorkflowId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
}

export async function removeWorkflowDependency(workflowId: string, dependsOnWorkflowId: string) {
  const { session, organizationId } = await requireWorkflowRelationsManager(workflowId);

  await prisma.workflowDependency.deleteMany({ where: { organizationId, workflowId, dependsOnWorkflowId } });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "workflow.dependency_removed",
    entityType: "Workflow",
    entityId: workflowId,
    metadata: { dependsOnWorkflowId },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
}
