import "server-only";
import { prisma } from "@/lib/prisma";
import { getRealAdoptionMetrics } from "@/lib/queries/adoption";

type DigestResult = { organizationId: string; orgName: string; status: "sent" | "skipped" | "error"; reason?: string };

async function findPostableChannel(accessToken: string): Promise<string | null> {
  const res = await fetch("https://slack.com/api/conversations.list?types=public_channel&limit=200", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!data.ok) return null;
  const channels: { id: string; name: string; is_member: boolean }[] = data.channels ?? [];
  const member = channels.find((c) => c.is_member);
  const general = channels.find((c) => c.name === "general");
  return (member ?? general ?? channels[0])?.id ?? null;
}

async function postToSlack(accessToken: string, channel: string, text: string) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, text }),
  });
  return res.json();
}

/** Sends one org's weekly adoption digest to their connected Slack workspace. */
export async function sendWeeklyDigestForOrg(organizationId: string): Promise<DigestResult> {
  const [org, connection] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.integrationConnection.findFirst({
      where: { organizationId, status: "CONNECTED", accessToken: { not: null }, integration: { key: "slack" } },
    }),
  ]);
  if (!connection?.accessToken) return { organizationId, orgName: org.name, status: "skipped", reason: "slack_not_connected" };

  const channelId = await findPostableChannel(connection.accessToken);
  if (!channelId) return { organizationId, orgName: org.name, status: "skipped", reason: "no_channel" };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [metrics, lessonsThisWeek, usageEventsThisWeek, behindEmployees] = await Promise.all([
    getRealAdoptionMetrics(organizationId),
    prisma.lessonCompletion.count({ where: { completedAt: { gte: sevenDaysAgo }, employee: { organizationId } } }),
    prisma.aIUsageEvent.count({ where: { organizationId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.employee.findMany({
      where: {
        organizationId,
        lessonCompletions: { none: {} },
        aiUsageEvents: { none: {} },
      },
      include: { user: true },
      take: 3,
    }),
  ]);

  const lines = [
    `*${org.name} — weekly AI adoption digest*`,
    `Est. monthly hours saved: *${metrics.hoursSavedMonthly.toLocaleString()}*`,
    `Active this month: *${metrics.activeUsers}/${metrics.totalUsers}* employees (${metrics.adoptionPct}%)`,
    `This week: *${lessonsThisWeek}* lessons completed, *${usageEventsThisWeek}* AI actions logged`,
  ];
  if (behindEmployees.length > 0) {
    lines.push(`Haven't gotten started yet: ${behindEmployees.map((e) => e.user.name).join(", ")}`);
  }

  const result = await postToSlack(connection.accessToken, channelId, lines.join("\n"));
  if (!result.ok) return { organizationId, orgName: org.name, status: "error", reason: result.error ?? "unknown_error" };

  await prisma.integrationConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date() } });
  return { organizationId, orgName: org.name, status: "sent" };
}

export async function sendWeeklyDigestsForAllOrgs(): Promise<DigestResult[]> {
  const orgs = await prisma.organization.findMany({ where: { onboardingDone: true }, select: { id: true } });
  const results: DigestResult[] = [];
  for (const org of orgs) {
    try {
      results.push(await sendWeeklyDigestForOrg(org.id));
    } catch (error) {
      results.push({ organizationId: org.id, orgName: "unknown", status: "error", reason: String(error) });
    }
  }
  return results;
}
