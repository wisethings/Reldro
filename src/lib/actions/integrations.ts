"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";

export async function connectIntegration(integrationId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);

  await prisma.integrationConnection.upsert({
    where: { organizationId_integrationId: { organizationId: session.organizationId!, integrationId } },
    update: { status: "CONNECTED", connectedAt: new Date(), lastSyncAt: new Date() },
    create: {
      organizationId: session.organizationId!,
      integrationId,
      status: "CONNECTED",
      connectedAt: new Date(),
      lastSyncAt: new Date(),
      mockData: { recordsSynced: Math.floor(200 + Math.random() * 2000) },
    },
  });

  revalidatePath("/dashboard/integrations");
}

export async function disconnectIntegration(integrationId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);

  await prisma.integrationConnection.updateMany({
    where: { organizationId: session.organizationId!, integrationId },
    data: { status: "DISCONNECTED" },
  });

  revalidatePath("/dashboard/integrations");
}
