import "server-only";
import { prisma } from "@/lib/prisma";

export type UnconnectedToolUsage = { tool: string; count: number };

export type AiWaste = {
  totalActivity30d: number;
  workflowConnectedActivity30d: number;
  wastePct: number;
  departmentsAffected: string[];
  topUnconnectedTools: UnconnectedToolUsage[];
  recommendedOpportunities: { id: string; title: string; department: string; estAnnualValue: number }[];
};

/**
 * "AI waste": usage that isn't happening through a repeatable workflow the
 * org can standardize or measure. An AIUsageEvent counts as "workflow
 * connected" when its `tool` value is actually a workflow title (this is
 * how toggleWorkflowStep/logTemplateCopy log usage) rather than a raw tool
 * name like "ChatGPT" logged from ad hoc use. Real data only - no invented
 * dollar figure, since we can't honestly attribute a value to unmanaged
 * usage the way we can to an adopted workflow's linked opportunity.
 */
export async function getAiWaste(organizationId: string): Promise<AiWaste> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [events, workflowTitles] = await Promise.all([
    prisma.aIUsageEvent.findMany({
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      select: { tool: true, employee: { select: { department: { select: { name: true } } } } },
    }),
    prisma.workflow.findMany({ select: { title: true } }),
  ]);

  const workflowTitleSet = new Set(workflowTitles.map((w) => w.title));
  const connected = events.filter((e) => workflowTitleSet.has(e.tool));
  const unconnected = events.filter((e) => !workflowTitleSet.has(e.tool));

  const departmentsAffected = Array.from(
    new Set(unconnected.map((e) => e.employee?.department?.name).filter((d): d is string => Boolean(d)))
  );

  const toolCounts = new Map<string, number>();
  for (const e of unconnected) toolCounts.set(e.tool, (toolCounts.get(e.tool) ?? 0) + 1);
  const topUnconnectedTools = Array.from(toolCounts.entries())
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recommendedOpportunities =
    departmentsAffected.length > 0
      ? await prisma.opportunity.findMany({
          where: {
            organizationId,
            status: { in: ["IDENTIFIED", "PLANNED"] },
            department: { name: { in: departmentsAffected } },
          },
          orderBy: { estAnnualValue: "desc" },
          distinct: ["departmentId"],
          take: 3,
          select: { id: true, title: true, estAnnualValue: true, department: { select: { name: true } } },
        })
      : [];

  return {
    totalActivity30d: events.length,
    workflowConnectedActivity30d: connected.length,
    wastePct: events.length > 0 ? Math.round((unconnected.length / events.length) * 100) : 0,
    departmentsAffected,
    topUnconnectedTools,
    recommendedOpportunities: recommendedOpportunities.map((o) => ({
      id: o.id,
      title: o.title,
      department: o.department?.name ?? "Cross-functional",
      estAnnualValue: o.estAnnualValue,
    })),
  };
}
