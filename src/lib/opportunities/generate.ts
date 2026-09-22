import "server-only";
import { prisma } from "@/lib/prisma";
import type { ComplexityLevel, ImpactLevel } from "@prisma/client";

/**
 * Turns the global workflow catalog into a real, org-specific opportunity
 * backlog. Runs once, right after onboarding, using exactly what the org
 * told us: the departments they picked and their industry/size. This is
 * what makes the assess -> discover loop work for every org, not just the
 * seeded demo account.
 *
 * The model is deliberately simple and transparent (same philosophy as
 * `src/lib/scoring.ts`): every score is derived from fields already on the
 * workflow, not randomized, so it's explainable and stable if re-inspected.
 */

const HOURLY_VALUE = 45; // blended fully-loaded cost per hour, used for $ estimates
const WORKING_DAYS_PER_MONTH = 21;

const SIZE_TO_HEADCOUNT: Record<string, number> = {
  "1-50": 25,
  "51-200": 120,
  "201-500": 350,
  "501-1000": 750,
  "1000-5000": 2500,
  "5000+": 8000,
};

const DIFFICULTY_RISK: Record<ComplexityLevel, number> = { LOW: 15, MEDIUM: 35, HIGH: 60 };
const DIFFICULTY_ADOPTION_PENALTY: Record<ComplexityLevel, number> = { LOW: 5, MEDIUM: 25, HIGH: 45 };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function impactFromScore(businessImpactScore: number): ImpactLevel {
  if (businessImpactScore >= 65) return "HIGH";
  if (businessImpactScore >= 40) return "MEDIUM";
  return "LOW";
}

export async function generateOpportunitiesForOrg(organizationId: string) {
  const existing = await prisma.opportunity.count({ where: { organizationId } });
  if (existing > 0) return; // already generated (or hand-seeded) - never duplicate

  const [org, departments] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.department.findMany({ where: { organizationId } }),
  ]);
  if (departments.length === 0) return;

  const deptByName = new Map(departments.map((d) => [d.name, d]));
  const workflows = await prisma.workflow.findMany({
    where: { department: { in: departments.map((d) => d.name) } },
  });
  if (workflows.length === 0) return;

  const headcount = SIZE_TO_HEADCOUNT[org.size] ?? SIZE_TO_HEADCOUNT["51-200"];
  const affectedEmployees = Math.max(3, Math.round(headcount * 0.12));

  await prisma.opportunity.createMany({
    data: workflows.map((w) => {
      const industryMatch = w.industryTags.length === 0 || w.industryTags.includes(org.industry);
      const businessImpactScore = clamp(35 + w.timeSavedMinutes * 1.1 + (industryMatch ? 10 : 0), 15, 97);
      const adoptionPotentialScore = clamp(90 - DIFFICULTY_ADOPTION_PENALTY[w.difficulty], 20, 95);
      const frequencyScore = clamp(50 + w.timeSavedMinutes * 0.6, 20, 95);
      const riskScore = DIFFICULTY_RISK[w.difficulty];
      const estHoursSavedMonthly = Math.round((w.timeSavedMinutes * affectedEmployees * WORKING_DAYS_PER_MONTH) / 60);

      return {
        organizationId,
        departmentId: deptByName.get(w.department)!.id,
        workflowId: w.id,
        title: w.title,
        currentProcess: w.currentProcess,
        aiOpportunity: w.aiProcess,
        impact: impactFromScore(businessImpactScore),
        complexity: w.difficulty,
        estHoursSavedMonthly,
        estAnnualValue: Math.round(estHoursSavedMonthly * 12 * HOURLY_VALUE),
        status: "IDENTIFIED",
        recommendedSpecialist: w.difficulty === "HIGH",
        businessImpactScore,
        adoptionPotentialScore,
        frequencyScore,
        riskScore,
        toolsRequired: w.toolsRequired,
      };
    }),
  });
}
