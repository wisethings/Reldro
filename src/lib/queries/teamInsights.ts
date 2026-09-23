import "server-only";
import { getFluencyForEmployees } from "@/lib/queries/fluency";
import { getEmployeeEngagement } from "@/lib/queries/team";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";

export type TeamGap = { category: EmployeeSkillCategory; label: string; averageScore: number };

/**
 * Team-level skill gaps: average each fluency dimension across everyone on
 * the team who has completed an assessment, ranked weakest first. Only
 * covers employees with a real assessment - never backfills a fake score
 * for someone who hasn't taken one, so the average only reflects real data.
 */
export async function getTeamGaps(employeeIds: string[]): Promise<TeamGap[]> {
  const fluencyMap = await getFluencyForEmployees(employeeIds);
  const breakdowns = Array.from(fluencyMap.values()).map((f) => f.breakdown);
  if (breakdowns.length === 0) return [];

  const categories = Object.keys(breakdowns[0]) as EmployeeSkillCategory[];
  const gaps = categories.map((category) => {
    const sum = breakdowns.reduce((acc, b) => acc + (b[category] ?? 0), 0);
    return { category, label: EMPLOYEE_SKILL_LABELS[category], averageScore: Math.round(sum / breakdowns.length) };
  });

  return gaps.sort((a, b) => a.averageScore - b.averageScore);
}

export type AttentionReason =
  | { type: "low-fluency"; score: number }
  | { type: "high-activity-low-adoption"; activityCount: number };

export type EmployeeNeedingAttention = {
  employeeId: string;
  reason: AttentionReason;
  summary: string;
  recommendation: string;
  recommendationHref: string;
};

const LOW_FLUENCY_THRESHOLD = 50;
const HIGH_ACTIVITY_THRESHOLD = 5;

/**
 * Flags employees a manager should look at, for one of two real reasons:
 * low measured AI fluency, or high AI usage that hasn't turned into any
 * workflow adoption yet (using AI a lot, but not in a way the org can
 * standardize or measure). Employees with neither signal - including ones
 * who simply haven't taken an assessment yet - aren't flagged; we don't
 * treat "no data" as "needs attention."
 */
export async function getEmployeesNeedingAttention(employeeIds: string[]): Promise<EmployeeNeedingAttention[]> {
  const [fluencyMap, engagementMap] = await Promise.all([
    getFluencyForEmployees(employeeIds),
    getEmployeeEngagement(employeeIds),
  ]);

  const results: EmployeeNeedingAttention[] = [];
  for (const employeeId of employeeIds) {
    const fluency = fluencyMap.get(employeeId);
    const engagement = engagementMap.get(employeeId);

    if (fluency && fluency.overallScore < LOW_FLUENCY_THRESHOLD) {
      results.push({
        employeeId,
        reason: { type: "low-fluency", score: fluency.overallScore },
        summary: `AI fluency is ${fluency.overallScore}/100`,
        recommendation: "Assign an AI skills lesson",
        recommendationHref: "/dashboard/learn",
      });
      continue;
    }

    if (engagement && engagement.aiActivityCount30d >= HIGH_ACTIVITY_THRESHOLD && engagement.workflowStepsCompleted === 0) {
      results.push({
        employeeId,
        reason: { type: "high-activity-low-adoption", activityCount: engagement.aiActivityCount30d },
        summary: "High AI activity but hasn't adopted a workflow yet",
        recommendation: "Point them at a relevant workflow",
        recommendationHref: "/dashboard/workflows",
      });
    }
  }

  return results;
}
