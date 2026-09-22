import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeSlackCode, verifySlackState } from "@/lib/integrations/slack";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const redirectUri = `${url.origin}/api/integrations/slack/callback`;
  const settingsUrl = new URL("/dashboard/integrations", url.origin);

  if (url.searchParams.get("error")) {
    settingsUrl.searchParams.set("slack_error", url.searchParams.get("error")!);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state) {
    settingsUrl.searchParams.set("slack_error", "missing_code_or_state");
    return NextResponse.redirect(settingsUrl);
  }

  const claims = await verifySlackState(state);
  if (!claims) {
    settingsUrl.searchParams.set("slack_error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const result = await exchangeSlackCode(code, redirectUri);
  if (!result.ok) {
    settingsUrl.searchParams.set("slack_error", result.error);
    return NextResponse.redirect(settingsUrl);
  }

  await prisma.integrationConnection.upsert({
    where: { organizationId_integrationId: { organizationId: claims.organizationId, integrationId: claims.integrationId } },
    update: {
      status: "CONNECTED",
      connectedAt: new Date(),
      lastSyncAt: new Date(),
      accessToken: result.accessToken,
      externalAccountId: result.teamId,
      externalAccountName: result.teamName,
    },
    create: {
      organizationId: claims.organizationId,
      integrationId: claims.integrationId,
      status: "CONNECTED",
      connectedAt: new Date(),
      lastSyncAt: new Date(),
      accessToken: result.accessToken,
      externalAccountId: result.teamId,
      externalAccountName: result.teamName,
    },
  });

  settingsUrl.searchParams.set("slack_connected", "1");
  return NextResponse.redirect(settingsUrl);
}
