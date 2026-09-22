"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { isSlackConfigured, signSlackState, slackAuthorizeUrl } from "@/lib/integrations/slack";

/**
 * Connects an integration. Slack is wired up to real OAuth when configured
 * (SLACK_CLIENT_ID/SECRET set) - this redirects to Slack's own consent
 * screen instead of faking a connection. Every other catalog integration,
 * and Slack itself when unconfigured, falls back to the original demo
 * connect (an instant mock connection, clearly labeled as such in the UI).
 */
export async function connectIntegration(integrationId: string) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  const organizationId = session.organizationId!;

  const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
  if (integration?.key === "slack" && isSlackConfigured()) {
    const host = (await headers()).get("host");
    const redirectUri = `https://${host}/api/integrations/slack/callback`;
    const state = await signSlackState({ organizationId, integrationId });
    redirect(slackAuthorizeUrl(state, redirectUri));
  }

  await prisma.integrationConnection.upsert({
    where: { organizationId_integrationId: { organizationId, integrationId } },
    update: { status: "CONNECTED", connectedAt: new Date(), lastSyncAt: new Date() },
    create: {
      organizationId,
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
    data: { status: "DISCONNECTED", accessToken: null, externalAccountId: null, externalAccountName: null },
  });

  revalidatePath("/dashboard/integrations");
}
