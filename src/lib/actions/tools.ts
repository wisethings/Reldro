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
