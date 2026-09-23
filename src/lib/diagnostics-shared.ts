import type { OrgMaturityCategory } from "@/lib/scoring";

export type DimensionStatus = "strong" | "developing" | "needs-attention" | "critical";

export type DimensionDiagnostic = {
  category: OrgMaturityCategory;
  label: string;
  score: number;
  status: DimensionStatus;
  meaning: string;
  evidence: string[];
  recommendedAction: string;
};

export const STATUS_LABEL: Record<DimensionStatus, string> = {
  strong: "Strong",
  developing: "Developing",
  "needs-attention": "Needs attention",
  critical: "Critical gap",
};

export function getBiggestConstraints(diagnostics: DimensionDiagnostic[], count = 2): DimensionDiagnostic[] {
  return diagnostics.slice().sort((a, b) => a.score - b.score).slice(0, count);
}
