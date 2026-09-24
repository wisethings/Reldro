import "server-only";
import { prisma } from "@/lib/prisma";
import { describeAuditAction, type AuditAction } from "@/lib/audit";

const FEED_ACTIONS: AuditAction[] = [
  "reward.points_awarded",
  "reward.redeemed",
  "reward.recognition_given",
  "certification.earned",
  "workflow.adopted",
];

export type ActivityFeedItem = { id: string; text: string; createdAt: Date };

/**
 * Real activity, built on the existing audit trail rather than a separate
 * feed system - every line here is something that actually happened and was
 * already being logged for the audit trail; this just renders a readable,
 * company-visible subset of it.
 */
export async function getAiActivityFeed(organizationId: string, limit = 12): Promise<ActivityFeedItem[]> {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId, action: { in: FEED_ACTIONS } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const employeeIds = new Set<string>();
  for (const log of logs) {
    const meta = (log.metadata as Record<string, unknown>) ?? {};
    for (const key of ["employeeId", "toEmployeeId"]) {
      if (typeof meta[key] === "string") employeeIds.add(meta[key] as string);
    }
  }
  const employees = employeeIds.size
    ? await prisma.employee.findMany({ where: { id: { in: Array.from(employeeIds) } }, include: { user: true } })
    : [];
  const nameById = new Map(employees.map((e) => [e.id, e.user.name]));

  return logs.map((log) => ({ id: log.id, text: describeActivityFeedEntry(log.action, log.metadata as Record<string, unknown>, nameById), createdAt: log.createdAt }));
}

function describeActivityFeedEntry(action: string, metaRaw: Record<string, unknown> | null, nameById: Map<string, string>): string {
  const meta = metaRaw ?? {};
  const nameFor = (key: string) => {
    const id = meta[key];
    return typeof id === "string" ? nameById.get(id) ?? "Someone" : "Someone";
  };

  switch (action) {
    case "reward.points_awarded":
      return `${nameFor("employeeId")} earned ${meta.points ?? ""} AI points for ${meta.reason ?? ""}`;
    case "reward.redeemed":
      return `${nameFor("employeeId")} redeemed ${meta.pointCost ?? ""} points for ${meta.name ?? "a reward"}`;
    case "reward.recognition_given": {
      const category = typeof meta.category === "string" ? meta.category.replace(/_/g, " ").toLowerCase() : "AI adoption";
      const type = meta.type === "PEER" ? "a peer" : "a manager";
      return `${nameFor("toEmployeeId")} was recognized by ${type} for ${category}`;
    }
    case "certification.earned":
      return `${nameFor("employeeId")} earned the ${meta.title ?? "certification"}`;
    case "workflow.adopted":
      return "A team adopted a new AI workflow";
    default:
      return describeAuditAction(action);
  }
}
