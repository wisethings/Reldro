"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/guards";

export async function adoptWorkflow(workflowId: string) {
  const session = await requireOrganization();

  await prisma.organizationWorkflow.upsert({
    where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId } },
    update: { status: "ADOPTED", adoptedAt: new Date() },
    create: {
      organizationId: session.organizationId,
      workflowId,
      status: "ADOPTED",
      adoptedAt: new Date(),
      usersAdopted: 1,
    },
  });

  revalidatePath(`/dashboard/workflows/${workflowId}`);
  revalidatePath("/dashboard/workflows");
  revalidatePath("/dashboard/overview");
}
