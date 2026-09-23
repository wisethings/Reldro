/**
 * Employee AI capability levels - a real banding of demonstrated capability
 * (fluency score + how many distinct workflows they've actually used), the
 * same philosophy as maturityBand() in scoring.ts for the org-level score.
 * Progression is never based on time spent in the product, only on real
 * signals already tracked elsewhere.
 */
export type CapabilityLevel = 1 | 2 | 3 | 4 | 5;

export const CAPABILITY_LEVEL_LABEL: Record<CapabilityLevel, string> = {
  1: "AI Explorer",
  2: "AI Practitioner",
  3: "AI Power User",
  4: "AI Workflow Builder",
  5: "AI Champion",
};

export const CAPABILITY_LEVEL_DESCRIPTION: Record<CapabilityLevel, string> = {
  1: "Understands basic AI concepts and approved company usage.",
  2: "Uses approved AI tools and workflows effectively.",
  3: "Consistently uses multiple AI workflows and demonstrates strong AI judgment.",
  4: "Can design, improve, and optimize AI-enabled workflows.",
  5: "Demonstrates advanced capability and helps their team adopt AI effectively.",
};

export function getCapabilityLevel(input: { fluencyScore: number | null; workflowsUsed: number }): CapabilityLevel {
  const fluency = input.fluencyScore ?? 0;
  const workflows = input.workflowsUsed;

  if (fluency >= 80 && workflows >= 3) return 5;
  if (fluency >= 65 && workflows >= 2) return 4;
  if (fluency >= 50 && workflows >= 1) return 3;
  if (fluency >= 30 || workflows >= 1) return 2;
  return 1;
}
