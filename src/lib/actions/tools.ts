"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import type { ToolApprovalStatus, ToolCategory } from "@prisma/client";

/** Adds an existing catalog tool to this org's library, or updates its status if already added. */
export async function setToolStatus(toolId: string, status: ToolApprovalStatus) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  // A tool is either the shared global catalog (organizationId null) or a
  // specific org's private custom tool - without this check, any org could
  // "adopt" another org's private tool into their own library just by
  // knowing its id.
  const tool = await prisma.tool.findFirst({ where: { id: toolId, OR: [{ organizationId: null }, { organizationId }] } });
  if (!tool) throw new Error("Tool not found");

  await prisma.organizationTool.upsert({
    where: { organizationId_toolId: { organizationId, toolId } },
    update: { status },
    create: { organizationId, toolId, status },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "tool.status_changed",
    entityType: "Tool",
    entityId: toolId,
    metadata: { status },
  });

  revalidatePath("/dashboard/integrations/tools");
  revalidatePath(`/dashboard/integrations/tools/${toolId}`);
}

export async function addCustomTool(params: {
  name: string;
  category: ToolCategory;
  vendor?: string;
  description: string;
  capabilities: string[];
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const tool = await prisma.tool.create({
    data: {
      name: params.name,
      category: params.category,
      vendor: params.vendor || null,
      description: params.description,
      capabilities: params.capabilities,
      isCustom: true,
      organizationId,
    },
  });

  await prisma.organizationTool.create({
    data: { organizationId, toolId: tool.id, status: "UNDER_REVIEW" },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "tool.status_changed",
    entityType: "Tool",
    entityId: tool.id,
    metadata: { name: params.name, status: "UNDER_REVIEW", custom: true },
  });

  revalidatePath("/dashboard/integrations/tools");
  return { toolId: tool.id };
}

/**
 * "When you use this tool here, this is how you're expected to use AI" -
 * guidance plus explicit approved/restricted uses for a tool already in the
 * org's library. Requires the tool to already have an OrganizationTool row
 * (i.e. it's been added/reviewed), so this can't silently add an unreviewed
 * tool via the back door.
 */
export async function setToolPlaybook(params: {
  toolId: string;
  guidance: string;
  approvedUses: string[];
  restrictedUses: string[];
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  await prisma.organizationTool.update({
    where: { organizationId_toolId: { organizationId, toolId: params.toolId } },
    data: {
      guidance: params.guidance || null,
      approvedUses: params.approvedUses,
      restrictedUses: params.restrictedUses,
    },
  });

  await logAudit({
    organizationId,
    userId: session.sub,
    action: "tool.status_changed",
    entityType: "Tool",
    entityId: params.toolId,
    metadata: { playbookUpdated: true },
  });

  revalidatePath(`/dashboard/integrations/tools/${params.toolId}`);
}
