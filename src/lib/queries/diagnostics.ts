import "server-only";
import { prisma } from "@/lib/prisma";
import { getRealAdoptionMetrics } from "@/lib/queries/adoption";
import { ORG_MATURITY_LABELS, type OrgMaturityCategory } from "@/lib/scoring";
import { type DimensionDiagnostic, type DimensionStatus } from "@/lib/diagnostics-shared";
import { DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export type { DimensionDiagnostic, DimensionStatus } from "@/lib/diagnostics-shared";
export { STATUS_LABEL, getBiggestConstraints } from "@/lib/diagnostics-shared";

function statusFor(score: number): DimensionStatus {
  if (score >= 70) return "strong";
  if (score >= 50) return "developing";
  if (score >= 30) return "needs-attention";
  return "critical";
}

const MEANING: Record<OrgMaturityCategory, Record<DimensionStatus, string>> = {
  literacy: {
    strong: "Employees understand AI fundamentals and are comfortable evaluating AI output.",
    developing: "Most employees have basic AI literacy, but deeper skills like evaluation and prompting vary widely.",
    "needs-attention": "AI literacy is inconsistent across the organization. Many employees are still building fundamental skills.",
    critical: "AI literacy is a significant gap. Most employees haven't built the fundamental skills needed to use AI effectively.",
  },
  usage: {
    strong: "AI is used consistently across most of the organization.",
    developing: "A meaningful share of employees use AI regularly, but adoption isn't yet universal.",
    "needs-attention": "AI usage is still concentrated in pockets rather than spread across the organization.",
    critical: "Most employees are not yet using AI in their day-to-day work.",
  },
  workflowIntegration: {
    strong: "AI usage is embedded in repeatable workflows across teams.",
    developing: "Some AI usage has been converted into repeatable workflows, but most is still ad hoc.",
    "needs-attention": "Employees are actively experimenting with AI, but most usage is still occurring in standalone tools rather than repeatable workflows.",
    critical: "AI usage is almost entirely ad hoc. Very little of it has been turned into a repeatable workflow.",
  },
  governance: {
    strong: "AI tool usage is well governed, with clear policies and approved tools.",
    developing: "Governance is in place but coverage is incomplete across tools and teams.",
    "needs-attention": "AI governance is limited. Tool usage and data-handling policies need attention.",
    critical: "There is little to no formal governance over how AI tools are used.",
  },
  measurement: {
    strong: "The organization consistently measures the business impact of AI adoption.",
    developing: "Some AI workflows have measurable outcomes, but measurement isn't yet consistent.",
    "needs-attention": "Only a limited number of AI workflows have measurable business outcomes.",
    critical: "The organization has little visibility into whether AI usage is creating measurable value.",
  },
  leadershipAdoption: {
    strong: "Leadership actively models and champions AI adoption.",
    developing: "Leadership supports AI adoption, but visible champions could extend further across teams.",
    "needs-attention": "Leadership adoption is inconsistent, which is slowing broader adoption.",
    critical: "Limited visible leadership adoption is a barrier to broader AI adoption.",
  },
};

const RECOMMENDED_ACTION: Record<OrgMaturityCategory, string> = {
  literacy: "Assign foundational AI lessons to employees who haven't completed one yet.",
  usage: "Identify the departments with the lowest active usage and remove their biggest blockers first.",
  workflowIntegration: "Convert your highest-frequency AI usage into a repeatable, adopted workflow.",
  governance: "Review which AI tools are actually in use and formalize which ones are approved.",
  measurement: "Pick one adopted workflow and start tracking its hours saved and business outcome explicitly.",
  leadershipAdoption: "Have a leader publicly adopt and share results from one AI workflow.",
};

/**
 * Diagnostic detail for each of the six maturity dimensions. The scores
 * themselves come from the org's self-reported assessment (see
 * submitOrgAssessment) — this layer doesn't reinterpret that score, it adds
 * real, independently-computed activity evidence alongside it so the score
 * isn't just a number with no context.
 */
export async function getDimensionDiagnostics(
  organizationId: string,
  breakdown: Record<OrgMaturityCategory, number>
): Promise<DimensionDiagnostic[]> {
  const [metrics, workflowsAdopted, distinctTools] = await Promise.all([
    getRealAdoptionMetrics(organizationId),
    prisma.organizationWorkflow.count({ where: { organizationId, status: { in: DEPLOYED_STATUSES } } }),
    prisma.aIUsageEvent.findMany({ where: { organizationId }, select: { tool: true }, distinct: ["tool"] }),
  ]);

  const toolsDetected = distinctTools.length;
  const connectedIntegrations = await prisma.integrationConnection.count({
    where: { organizationId, status: "CONNECTED" },
  });

  const EVIDENCE: Record<OrgMaturityCategory, string[]> = {
    literacy: [
      `${metrics.activeUsers}/${metrics.totalUsers} employees active on Reldro in the last 30 days`,
      `${toolsDetected} distinct AI tools detected in usage`,
    ],
    usage: [
      `${metrics.adoptionPct}% AI adoption`,
      `${toolsDetected} AI tools detected`,
      `${metrics.activeUsers}/${metrics.totalUsers} active users`,
    ],
    workflowIntegration: [
      `${workflowsAdopted} workflows deployed`,
      `${breakdown.workflowIntegration}% workflow integration`,
      `${toolsDetected} AI tools detected`,
      `${metrics.activeUsers}/${metrics.totalUsers} active users`,
    ],
    governance: [
      `${connectedIntegrations} integrations connected`,
      `${toolsDetected} AI tools detected in usage`,
    ],
    measurement: [
      `${workflowsAdopted} workflows adopted and trackable`,
      `${metrics.hoursSavedMonthly} hours/month currently attributed to them`,
    ],
    leadershipAdoption: [
      `${metrics.adoptionPct}% org-wide AI adoption`,
      `${metrics.activeUsers}/${metrics.totalUsers} active users`,
    ],
  };

  return (Object.keys(breakdown) as OrgMaturityCategory[]).map((category) => {
    const score = breakdown[category];
    const status = statusFor(score);
    return {
      category,
      label: ORG_MATURITY_LABELS[category],
      score,
      status,
      meaning: MEANING[category][status],
      evidence: EVIDENCE[category],
      recommendedAction: RECOMMENDED_ACTION[category],
    };
  });
}
