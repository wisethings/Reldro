import "server-only";
import { prisma } from "@/lib/prisma";
import { getFluencyForEmployee } from "@/lib/queries/fluency";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";

export type SkillEvidence = {
  skill: EmployeeSkillCategory;
  label: string;
  score: number;
  evidenceLines: string[];
};

const ALL_SKILLS: EmployeeSkillCategory[] = ["fundamentals", "prompting", "workflowDesign", "evaluation", "automation"];

/**
 * "Why is my score X? Show the evidence." Every line here traces back to a
 * real completion or attempt count - never a fabricated breakdown like
 * "8/10 correct" when the platform doesn't actually track sub-question
 * results that granularly.
 */
export async function getSkillMasteryEvidence(employeeId: string): Promise<SkillEvidence[]> {
  const fluency = await getFluencyForEmployee(employeeId);

  const [lessons, completions, simulations, attempts] = await Promise.all([
    prisma.lesson.findMany({ select: { id: true, skills: true } }),
    prisma.lessonCompletion.findMany({ where: { employeeId }, select: { lessonId: true } }),
    prisma.simulation.findMany({ select: { id: true, skills: true } }),
    prisma.simulationAttempt.findMany({ where: { employeeId }, select: { simulationId: true, score: true, passed: true } }),
  ]);

  const completedLessonIds = new Set(completions.map((c) => c.lessonId));
  const attemptsBySim = new Map<string, { score: number; passed: boolean }[]>();
  for (const a of attempts) {
    attemptsBySim.set(a.simulationId, [...(attemptsBySim.get(a.simulationId) ?? []), { score: a.score, passed: a.passed }]);
  }

  return ALL_SKILLS.map((skill) => {
    const skillLessons = lessons.filter((l) => l.skills.includes(skill));
    const skillSims = simulations.filter((s) => s.skills.includes(skill));
    const lessonsCompleted = skillLessons.filter((l) => completedLessonIds.has(l.id)).length;

    const attemptedSims = skillSims.filter((s) => attemptsBySim.has(s.id));
    const allAttempts = attemptedSims.flatMap((s) => attemptsBySim.get(s.id)!);
    const avgScore = allAttempts.length ? Math.round(allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length) : null;
    const passedCount = attemptedSims.filter((s) => attemptsBySim.get(s.id)!.some((a) => a.passed)).length;

    const evidenceLines: string[] = [];
    if (skillLessons.length > 0) {
      evidenceLines.push(`Completed ${lessonsCompleted}/${skillLessons.length} lessons that build this skill.`);
    }
    if (attemptedSims.length > 0) {
      evidenceLines.push(
        `Averaged ${avgScore}/100 across ${allAttempts.length} attempt${allAttempts.length === 1 ? "" : "s"} on simulations testing this skill, passing ${passedCount}/${attemptedSims.length}.`
      );
    } else if (skillSims.length > 0) {
      evidenceLines.push(`${skillSims.length} simulation${skillSims.length === 1 ? "" : "s"} test this skill - not yet attempted.`);
    }
    if (evidenceLines.length === 0) evidenceLines.push("No lessons or simulations are tagged for this skill yet.");

    return { skill, label: EMPLOYEE_SKILL_LABELS[skill], score: fluency?.breakdown[skill] ?? 0, evidenceLines };
  });
}
