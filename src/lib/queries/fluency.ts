import "server-only";
import { prisma } from "@/lib/prisma";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";

export type EmployeeFluency = {
  overallScore: number;
  breakdown: Record<EmployeeSkillCategory, number>;
  assessedAt: Date;
};

export const EMPTY_SKILL_BREAKDOWN: Record<EmployeeSkillCategory, number> = {
  fundamentals: 0,
  prompting: 0,
  workflowDesign: 0,
  evaluation: 0,
  automation: 0,
};

/**
 * AI Fluency (how effectively someone uses AI) is intentionally kept
 * distinct from AI Adoption (whether they use it at all - see
 * getRealAdoptionMetrics). This reads each employee's most recent
 * self-assessment rather than duplicating it into a second table, so
 * there's exactly one place fluency data can drift from what the employee
 * actually reported. Batched for team/department views - one query for many
 * employees instead of N+1.
 */
export async function getFluencyForEmployees(employeeIds: string[]): Promise<Map<string, EmployeeFluency>> {
  if (employeeIds.length === 0) return new Map();

  const assessments = await prisma.assessment.findMany({
    where: { employeeId: { in: employeeIds }, type: "EMPLOYEE", status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    distinct: ["employeeId"],
  });

  const map = new Map<string, EmployeeFluency>();
  for (const a of assessments) {
    if (!a.employeeId || a.overallScore === null || !a.scoreBreakdown || !a.completedAt) continue;
    map.set(a.employeeId, {
      overallScore: a.overallScore,
      breakdown: a.scoreBreakdown as Record<EmployeeSkillCategory, number>,
      assessedAt: a.completedAt,
    });
  }
  return map;
}

export async function getFluencyForEmployee(employeeId: string): Promise<EmployeeFluency | null> {
  const map = await getFluencyForEmployees([employeeId]);
  return map.get(employeeId) ?? null;
}

export function getWeakestSkill(breakdown: Record<EmployeeSkillCategory, number>): EmployeeSkillCategory {
  return (Object.keys(breakdown) as EmployeeSkillCategory[]).sort((a, b) => breakdown[a] - breakdown[b])[0];
}

export function getStrongestSkill(breakdown: Record<EmployeeSkillCategory, number>): EmployeeSkillCategory {
  return (Object.keys(breakdown) as EmployeeSkillCategory[]).sort((a, b) => breakdown[b] - breakdown[a])[0];
}

/** Average fluency breakdown across a group (e.g. a department) - used to find team-level skill gaps. */
export function averageBreakdown(breakdowns: Record<EmployeeSkillCategory, number>[]): Record<EmployeeSkillCategory, number> {
  if (breakdowns.length === 0) return EMPTY_SKILL_BREAKDOWN;
  const sums: Record<EmployeeSkillCategory, number> = { ...EMPTY_SKILL_BREAKDOWN };
  for (const b of breakdowns) {
    for (const key of Object.keys(sums) as EmployeeSkillCategory[]) sums[key] += b[key] ?? 0;
  }
  const out: Record<EmployeeSkillCategory, number> = { ...EMPTY_SKILL_BREAKDOWN };
  for (const key of Object.keys(out) as EmployeeSkillCategory[]) out[key] = Math.round(sums[key] / breakdowns.length);
  return out;
}

export { EMPLOYEE_SKILL_LABELS };
