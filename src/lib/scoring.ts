/**
 * Reldro scoring models.
 *
 * These are deliberately simple, transparent weighted-average models so the
 * platform's scores are explainable from day one. Every weight lives here so
 * the model can be swapped for a more sophisticated one (e.g. one trained on
 * outcome data) without touching call sites — everything downstream just
 * reads `overallScore` / `breakdown`.
 */

export type OrgMaturityCategory =
  | "literacy"
  | "usage"
  | "workflowIntegration"
  | "governance"
  | "measurement"
  | "leadershipAdoption";

export const ORG_MATURITY_WEIGHTS: Record<OrgMaturityCategory, number> = {
  literacy: 0.15,
  usage: 0.25,
  workflowIntegration: 0.25,
  governance: 0.1,
  measurement: 0.1,
  leadershipAdoption: 0.15,
};

export const ORG_MATURITY_LABELS: Record<OrgMaturityCategory, string> = {
  literacy: "AI literacy",
  usage: "AI usage",
  workflowIntegration: "Workflow integration",
  governance: "Governance",
  measurement: "Measurement",
  leadershipAdoption: "Leadership adoption",
};

export function computeOrgAdoptionScore(
  scores: Record<OrgMaturityCategory, number>
): number {
  const weighted = (Object.keys(ORG_MATURITY_WEIGHTS) as OrgMaturityCategory[]).reduce(
    (sum, key) => sum + scores[key] * ORG_MATURITY_WEIGHTS[key],
    0
  );
  return Math.round(weighted);
}

export function maturityBand(score: number): {
  label: string;
  description: string;
} {
  if (score >= 75) {
    return {
      label: "Advanced",
      description: "AI is embedded in core workflows and governed deliberately.",
    };
  }
  if (score >= 50) {
    return {
      label: "Scaling",
      description: "Pockets of strong adoption; ready to standardize across teams.",
    };
  }
  if (score >= 25) {
    return {
      label: "Emerging",
      description: "Early experimentation with AI; adoption is inconsistent.",
    };
  }
  return {
    label: "Foundational",
    description: "AI use is ad hoc or absent. Start with awareness and quick wins.",
  };
}

export type EmployeeSkillCategory =
  | "fundamentals"
  | "prompting"
  | "workflowDesign"
  | "evaluation"
  | "automation";

export const EMPLOYEE_SKILL_WEIGHTS: Record<EmployeeSkillCategory, number> = {
  fundamentals: 0.2,
  prompting: 0.25,
  workflowDesign: 0.2,
  evaluation: 0.2,
  automation: 0.15,
};

export const EMPLOYEE_SKILL_LABELS: Record<EmployeeSkillCategory, string> = {
  fundamentals: "AI fundamentals",
  prompting: "Prompting",
  workflowDesign: "Workflow design",
  evaluation: "Evaluation",
  automation: "Automation",
};

export function computeFluencyScore(
  scores: Record<EmployeeSkillCategory, number>
): number {
  const weighted = (Object.keys(EMPLOYEE_SKILL_WEIGHTS) as EmployeeSkillCategory[]).reduce(
    (sum, key) => sum + scores[key] * EMPLOYEE_SKILL_WEIGHTS[key],
    0
  );
  return Math.round(weighted);
}

/**
 * Opportunity prioritization: business impact and effort/risk drive quadrant
 * placement (impact/effort matrix). Adoption potential and frequency feed a
 * single "priority score" used for default sorting.
 */
export type OpportunityScoreInputs = {
  businessImpactScore: number; // 0-100
  adoptionPotentialScore: number; // 0-100
  frequencyScore: number; // 0-100
  riskScore: number; // 0-100 (higher = riskier)
  complexity: "LOW" | "MEDIUM" | "HIGH";
};

const COMPLEXITY_EFFORT: Record<OpportunityScoreInputs["complexity"], number> = {
  LOW: 20,
  MEDIUM: 55,
  HIGH: 85,
};

export function computeEffortScore(complexity: OpportunityScoreInputs["complexity"], riskScore: number) {
  return Math.round(COMPLEXITY_EFFORT[complexity] * 0.7 + riskScore * 0.3);
}

export function computePriorityScore(inputs: OpportunityScoreInputs): number {
  const effort = computeEffortScore(inputs.complexity, inputs.riskScore);
  const weighted =
    inputs.businessImpactScore * 0.4 +
    inputs.adoptionPotentialScore * 0.25 +
    inputs.frequencyScore * 0.15 +
    (100 - effort) * 0.2;
  return Math.round(weighted);
}

export type MatrixQuadrant = "quick-win" | "major-project" | "fill-in" | "reconsider";

export function opportunityQuadrant(inputs: OpportunityScoreInputs): MatrixQuadrant {
  const effort = computeEffortScore(inputs.complexity, inputs.riskScore);
  const highImpact = inputs.businessImpactScore >= 55;
  const highEffort = effort >= 50;
  if (highImpact && !highEffort) return "quick-win";
  if (highImpact && highEffort) return "major-project";
  if (!highImpact && !highEffort) return "fill-in";
  return "reconsider";
}

export const QUADRANT_LABELS: Record<MatrixQuadrant, string> = {
  "quick-win": "High impact / Low effort",
  "major-project": "High impact / High effort",
  "fill-in": "Low impact / Low effort",
  reconsider: "Low impact / High effort",
};
