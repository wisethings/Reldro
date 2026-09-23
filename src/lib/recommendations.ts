import "server-only";
import { prisma } from "@/lib/prisma";
import { getDepartmentSnapshots } from "@/lib/queries/adoption";
import { ORG_MATURITY_LABELS, type OrgMaturityCategory } from "@/lib/scoring";
import { getDimensionDiagnostics, getBiggestConstraints } from "@/lib/queries/diagnostics";

export type Recommendation = {
  id: string;
  title: string;
  category: "opportunity" | "assessment";
  reason: string;
  evidence: string[];
  expectedImpact: string;
  actionLabel: string;
  actionHref: string;
  relatedLearningHref?: string;
  relatedLearningLabel?: string;
  relatedWorkflowHref?: string;
  relatedWorkflowLabel?: string;
};

/**
 * The org-level recommendation engine behind "What should we do next?" on
 * Overview. Two recommendation types today, both derived from real org
 * state rather than canned copy:
 *  1. The highest-value open opportunity whose workflow isn't adopted yet.
 *  2. The organization's weakest assessment dimension.
 * Each only links to learning/workflow resources that actually exist for
 * this org — never a fabricated "recommended lesson."
 */
export async function getOrgRecommendations(organizationId: string): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  const topOpportunity = await prisma.opportunity.findFirst({
    where: {
      organizationId,
      status: { in: ["IDENTIFIED", "PLANNED"] },
      OR: [{ workflowId: null }, { workflow: { organizationWorkflows: { none: { organizationId, status: "ADOPTED" } } } }],
    },
    orderBy: { estAnnualValue: "desc" },
    include: { department: true, workflow: { include: { courses: true } } },
  });

  if (topOpportunity) {
    const deptSnapshots = topOpportunity.department ? await getDepartmentSnapshots(organizationId) : [];
    const deptSnapshot = deptSnapshots.find((s) => s.department === topOpportunity.department?.name);

    const reason = deptSnapshot
      ? `${topOpportunity.department!.name} adoption is ${deptSnapshot.adoptionPct}%, but workflow integration is only ${deptSnapshot.workflowIntegrationScore}%.`
      : `This is your highest-value open opportunity, estimated at $${Math.round(topOpportunity.estAnnualValue / 1000)}k/year.`;

    const course = topOpportunity.workflow?.courses[0];

    recommendations.push({
      id: `opportunity-${topOpportunity.id}`,
      title: `Launch ${topOpportunity.title}`,
      category: "opportunity",
      reason,
      evidence: [
        `$${Math.round(topOpportunity.estAnnualValue / 1000)}k estimated annual value`,
        `${topOpportunity.estHoursSavedMonthly} hrs/month estimated`,
        `${topOpportunity.complexity.toLowerCase()} complexity`,
      ],
      expectedImpact: `Up to $${Math.round(topOpportunity.estAnnualValue / 1000)}k/year in captured value once adopted.`,
      actionLabel: "View opportunity",
      actionHref: `/dashboard/opportunities/${topOpportunity.id}`,
      relatedWorkflowHref: topOpportunity.workflow ? `/dashboard/workflows/${topOpportunity.workflow.id}` : undefined,
      relatedWorkflowLabel: topOpportunity.workflow?.title,
      relatedLearningHref: course ? `/dashboard/learn?course=${course.id}` : undefined,
      relatedLearningLabel: course?.title,
    });
  }

  const latestSnapshot = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: null },
    orderBy: { month: "desc" },
  });

  if (latestSnapshot) {
    const breakdown: Record<OrgMaturityCategory, number> = {
      literacy: latestSnapshot.literacyScore,
      usage: latestSnapshot.usageScore,
      workflowIntegration: latestSnapshot.workflowIntegrationScore,
      governance: latestSnapshot.governanceScore,
      measurement: latestSnapshot.measurementScore,
      leadershipAdoption: latestSnapshot.leadershipScore,
    };
    const diagnostics = await getDimensionDiagnostics(organizationId, breakdown);
    const [weakest] = getBiggestConstraints(diagnostics, 1);

    if (weakest) {
      recommendations.push({
        id: `assessment-${weakest.category}`,
        title: `Improve ${ORG_MATURITY_LABELS[weakest.category]}`,
        category: "assessment",
        reason: weakest.meaning,
        evidence: weakest.evidence,
        expectedImpact: "A stronger AI Adoption Score and a clearer view of where AI is actually working.",
        actionLabel: "View assessment",
        actionHref: "/dashboard/assessment",
      });
    }
  }

  return recommendations;
}
