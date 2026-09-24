import "server-only";
import { prisma } from "@/lib/prisma";
import { PAIN_POINT_OPTIONS } from "@/lib/data/painPoints";
import type { ComplexityLevel, ImpactLevel } from "@prisma/client";

/**
 * Turns the global workflow catalog into a real, org-specific opportunity
 * backlog - but only for workflows the admin actually confirmed matter,
 * informed by the pain points they flagged per department during
 * onboarding. Auto-creating the entire catalog match with zero input on
 * what's actually a problem for the company read as presumptuous, so this
 * computes candidates and lets the onboarding wizard show them for
 * confirmation before anything is written.
 *
 * The scoring model is deliberately simple and transparent (same philosophy
 * as `src/lib/scoring.ts`): every score is derived from fields already on
 * the workflow, not randomized, so it's explainable and stable if
 * re-inspected.
 */

const HOURLY_VALUE = 45; // blended fully-loaded cost per hour, used for $ estimates
const WORKING_DAYS_PER_MONTH = 21;
const PAIN_POINT_MATCH_BOOST = 10;

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

export type OpportunityCandidate = {
  workflowId: string;
  departmentName: string;
  title: string;
  currentProcess: string;
  aiOpportunity: string;
  impact: ImpactLevel;
  complexity: ComplexityLevel;
  estHoursSavedMonthly: number;
  estAnnualValue: number;
  businessImpactScore: number;
  adoptionPotentialScore: number;
  frequencyScore: number;
  riskScore: number;
  toolsRequired: string[];
  matchedPainPoints: string[]; // labels of stated pain points this workflow addresses
  recommended: boolean;
};

/** Computes every candidate opportunity for the given org attributes, without writing anything. Used both for the onboarding preview and the final insert. */
export async function computeOpportunityCandidates(params: {
  industry: string;
  size: string;
  departments: string[];
  painPointsByDept: Record<string, string[]>;
}): Promise<OpportunityCandidate[]> {
  if (params.departments.length === 0) return [];

  const workflows = await prisma.workflow.findMany({
    where: { department: { in: params.departments } },
  });
  if (workflows.length === 0) return [];

  const headcount = SIZE_TO_HEADCOUNT[params.size] ?? SIZE_TO_HEADCOUNT["51-200"];
  const affectedEmployees = Math.max(3, Math.round(headcount * 0.12));

  const candidates = workflows.map((w) => {
    const industryMatch = w.industryTags.length === 0 || w.industryTags.includes(params.industry);
    const painPointKeys = params.painPointsByDept[w.department] ?? [];
    const searchable = `${w.title} ${w.summary} ${w.currentProcess}`.toLowerCase();
    const matchedPainPoints = PAIN_POINT_OPTIONS.filter(
      (p) => painPointKeys.includes(p.key) && p.keywords.some((k) => searchable.includes(k))
    ).map((p) => p.label);

    const businessImpactScore = clamp(
      35 + w.timeSavedMinutes * 1.1 + (industryMatch ? 10 : 0) + (matchedPainPoints.length > 0 ? PAIN_POINT_MATCH_BOOST : 0),
      15,
      97
    );
    const adoptionPotentialScore = clamp(90 - DIFFICULTY_ADOPTION_PENALTY[w.difficulty], 20, 95);
    const frequencyScore = clamp(50 + w.timeSavedMinutes * 0.6, 20, 95);
    const riskScore = DIFFICULTY_RISK[w.difficulty];
    const estHoursSavedMonthly = Math.round((w.timeSavedMinutes * affectedEmployees * WORKING_DAYS_PER_MONTH) / 60);

    return {
      workflowId: w.id,
      departmentName: w.department,
      title: w.title,
      currentProcess: w.currentProcess,
      aiOpportunity: w.aiProcess,
      impact: impactFromScore(businessImpactScore),
      complexity: w.difficulty,
      estHoursSavedMonthly,
      estAnnualValue: Math.round(estHoursSavedMonthly * 12 * HOURLY_VALUE),
      businessImpactScore,
      adoptionPotentialScore,
      frequencyScore,
      riskScore,
      toolsRequired: w.toolsRequired,
      matchedPainPoints,
      recommended: matchedPainPoints.length > 0,
    };
  });

  // If a department has no pain-point matches at all (the admin skipped that
  // question, or none of the catalog happened to match their wording),
  // fall back to recommending its top 2 by business impact so the
  // confirmation step never shows an empty, all-unchecked department.
  const byDept = new Map<string, OpportunityCandidate[]>();
  for (const c of candidates) byDept.set(c.departmentName, [...(byDept.get(c.departmentName) ?? []), c]);
  for (const deptCandidates of byDept.values()) {
    if (deptCandidates.some((c) => c.recommended)) continue;
    const topTwo = [...deptCandidates].sort((a, b) => b.businessImpactScore - a.businessImpactScore).slice(0, 2);
    for (const c of topTwo) c.recommended = true;
  }

  return candidates;
}

/** Creates Opportunity rows only for the workflows the admin confirmed, and records the stated pain points on each department for future reference. */
export async function createSelectedOpportunities(params: {
  organizationId: string;
  industry: string;
  size: string;
  departments: string[];
  painPointsByDept: Record<string, string[]>;
  selectedWorkflowIds: string[];
}) {
  const existing = await prisma.opportunity.count({ where: { organizationId: params.organizationId } });
  if (existing > 0) return; // already generated (or hand-seeded) - never duplicate

  await Promise.all(
    Object.entries(params.painPointsByDept)
      .filter(([, points]) => points.length > 0)
      .map(([name, points]) =>
        prisma.department.updateMany({
          where: { organizationId: params.organizationId, name },
          data: { painPoints: points },
        })
      )
  );

  if (params.selectedWorkflowIds.length === 0) return;

  const candidates = await computeOpportunityCandidates({
    industry: params.industry,
    size: params.size,
    departments: params.departments,
    painPointsByDept: params.painPointsByDept,
  });
  const selectedSet = new Set(params.selectedWorkflowIds);
  const selected = candidates.filter((c) => selectedSet.has(c.workflowId));
  if (selected.length === 0) return;

  const deptRows = await prisma.department.findMany({
    where: { organizationId: params.organizationId, name: { in: params.departments } },
  });
  const deptIdByName = new Map(deptRows.map((d) => [d.name, d.id]));

  await prisma.opportunity.createMany({
    data: selected.map((c) => ({
      organizationId: params.organizationId,
      departmentId: deptIdByName.get(c.departmentName)!,
      workflowId: c.workflowId,
      title: c.title,
      currentProcess: c.currentProcess,
      aiOpportunity: c.aiOpportunity,
      impact: c.impact,
      complexity: c.complexity,
      estHoursSavedMonthly: c.estHoursSavedMonthly,
      estAnnualValue: c.estAnnualValue,
      status: "IDENTIFIED",
      recommendedSpecialist: c.complexity === "HIGH",
      businessImpactScore: c.businessImpactScore,
      adoptionPotentialScore: c.adoptionPotentialScore,
      frequencyScore: c.frequencyScore,
      riskScore: c.riskScore,
      toolsRequired: c.toolsRequired,
    })),
  });
}
