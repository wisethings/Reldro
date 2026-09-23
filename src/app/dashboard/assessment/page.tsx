import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { OrgAssessmentPanel } from "@/components/assessment/OrgAssessmentPanel";
import { EmployeeAssessmentPanel } from "@/components/assessment/EmployeeAssessmentPanel";
import { getDimensionDiagnostics } from "@/lib/queries/diagnostics";
import type { OrgMaturityCategory, EmployeeSkillCategory } from "@/lib/scoring";

export default async function AssessmentPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  if (session.role === "EMPLOYEE") {
    if (!session.employeeId) redirect("/dashboard/overview");
    const assessments = await prisma.assessment.findMany({
      where: { employeeId: session.employeeId, type: "EMPLOYEE", status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    });
    const latest = assessments[0];
    const defaultBreakdown: Record<EmployeeSkillCategory, number> = {
      fundamentals: 0,
      prompting: 0,
      workflowDesign: 0,
      evaluation: 0,
      automation: 0,
    };

    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">AI Skills Assessment</h1>
          <p className="text-sm text-ink-500">Understand your AI fluency and what to learn next.</p>
        </div>
        <EmployeeAssessmentPanel
          overallScore={latest?.overallScore ?? 0}
          breakdown={(latest?.scoreBreakdown as Record<EmployeeSkillCategory, number>) ?? defaultBreakdown}
          completedAt={latest?.completedAt?.toLocaleDateString() ?? null}
          hasAssessment={Boolean(latest)}
        />
      </div>
    );
  }

  // COMPANY_ADMIN
  const assessments = await prisma.assessment.findMany({
    where: { organizationId: session.organizationId, type: "ORGANIZATION", status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });
  const latest = assessments[0];
  const defaultBreakdown: Record<OrgMaturityCategory, number> = {
    literacy: 0,
    usage: 0,
    workflowIntegration: 0,
    governance: 0,
    measurement: 0,
    leadershipAdoption: 0,
  };

  const breakdown = (latest?.scoreBreakdown as Record<OrgMaturityCategory, number>) ?? defaultBreakdown;
  const diagnostics = latest ? await getDimensionDiagnostics(session.organizationId, breakdown) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">AI Assessment</h1>
        <p className="text-sm text-ink-500">Your organization's AI maturity, measured across six dimensions.</p>
      </div>
      <OrgAssessmentPanel
        overallScore={latest?.overallScore ?? 0}
        breakdown={breakdown}
        completedAt={latest?.completedAt?.toLocaleDateString() ?? null}
        history={assessments
          .slice()
          .reverse()
          .map((a) => ({ date: a.completedAt?.toLocaleDateString() ?? "", score: a.overallScore ?? 0 }))}
        diagnostics={diagnostics}
      />
    </div>
  );
}
