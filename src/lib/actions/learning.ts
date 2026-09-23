"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { evaluateSimulationAttempt } from "@/lib/ai/simulationEvaluator";
import type { DecisionOption, AiOutputIssue } from "@/lib/simulationCatalog";
import { checkAndAwardCertifications } from "@/lib/queries/certifications";
import { awardPoints } from "@/lib/rewards";
import type { SimulationDimensions } from "@/lib/ai/simulationEvaluator";
import type { EmployeeSkillCategory } from "@/lib/scoring";

const DIMENSION_TO_SKILL: Record<keyof SimulationDimensions, EmployeeSkillCategory> = {
  reasoning: "fundamentals",
  aiUsage: "prompting",
  promptQuality: "prompting",
  accuracy: "evaluation",
  workflowAdherence: "workflowDesign",
};

async function getRecommendedLessonForWeakestDimension(
  employeeId: string,
  dimensions: SimulationDimensions
): Promise<{ id: string; title: string; skill: EmployeeSkillCategory } | null> {
  const weakestDimension = (Object.keys(dimensions) as (keyof SimulationDimensions)[]).sort(
    (a, b) => dimensions[a] - dimensions[b]
  )[0];
  const skill = DIMENSION_TO_SKILL[weakestDimension];

  const completedLessonIds = new Set(
    (await prisma.lessonCompletion.findMany({ where: { employeeId }, select: { lessonId: true } })).map((l) => l.lessonId)
  );
  const candidates = await prisma.lesson.findMany({
    where: { skills: { has: skill } },
    orderBy: { order: "asc" },
  });
  const next = candidates.find((l) => !completedLessonIds.has(l.id));
  return next ? { id: next.id, title: next.title, skill } : null;
}

export async function completeLesson(lessonId: string, knowledgeCheckCorrect?: boolean) {
  const session = await requireSession();
  if (!session.employeeId) throw new Error("No employee profile for this account");

  const alreadyCompleted = await prisma.lessonCompletion.findUnique({
    where: { employeeId_lessonId: { employeeId: session.employeeId, lessonId } },
  });

  await prisma.lessonCompletion.upsert({
    where: { employeeId_lessonId: { employeeId: session.employeeId, lessonId } },
    update: {},
    create: { employeeId: session.employeeId, lessonId, score: knowledgeCheckCorrect === false ? 60 : 100 },
  });

  if (!alreadyCompleted) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
    if (lesson) {
      const [course, totalLessons, completedLessons] = await Promise.all([
        prisma.course.findUnique({ where: { id: lesson.courseId }, select: { title: true } }),
        prisma.lesson.count({ where: { courseId: lesson.courseId } }),
        prisma.lesson.count({
          where: { courseId: lesson.courseId, completions: { some: { employeeId: session.employeeId } } },
        }),
      ]);
      if (course && totalLessons > 0 && completedLessons === totalLessons) {
        await awardPoints({
          employeeId: session.employeeId,
          organizationId: session.organizationId!,
          ruleKey: "course_completed",
          reason: `Completed learning path: ${course.title}`,
          entityType: "Course",
          entityId: lesson.courseId,
          dedupeKey: `course_completed:${lesson.courseId}`,
        });
      }
      await checkAndAwardCertifications(session.employeeId);
    }
  }

  revalidatePath("/dashboard/learn");
}

/**
 * Returns the consequence for exactly one decision option - never the full
 * decisionOptions array with every option's quality/consequence, which
 * would leak the "right answer" to the client before the employee decides.
 */
export async function revealDecisionConsequence(simulationId: string, optionId: string): Promise<{ consequence: string } | null> {
  const simulation = await prisma.simulation.findUnique({ where: { id: simulationId }, select: { decisionOptions: true } });
  if (!simulation) return null;
  const options = simulation.decisionOptions as unknown as DecisionOption[];
  const option = options.find((o) => o.id === optionId);
  return option ? { consequence: option.consequence } : null;
}

/** Never sends the correct index to the client - same reasoning as revealDecisionConsequence. */
export async function checkKnowledgeAnswer(lessonId: string, selectedIndex: number): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { knowledgeCheckCorrectIndex: true } });
  return lesson?.knowledgeCheckCorrectIndex === selectedIndex;
}

export async function submitSimulationAttempt(
  simulationId: string,
  input: { decisionChoiceId: string | null; evaluationChoices: string[]; reasoningResponse: string }
) {
  const session = await requireSession();
  if (!session.employeeId) throw new Error("No employee profile for this account");

  const simulation = await prisma.simulation.findUniqueOrThrow({ where: { id: simulationId } });
  const decisionOptions = simulation.decisionOptions as unknown as DecisionOption[];
  const aiOutputIssues = simulation.aiOutputIssues as unknown as AiOutputIssue[];

  const evaluation = evaluateSimulationAttempt({
    decisionOptions,
    decisionChoiceId: input.decisionChoiceId,
    aiOutputIssues,
    evaluationChoices: input.evaluationChoices,
    reasoningResponse: input.reasoningResponse,
  });

  const priorAttempts = await prisma.simulationAttempt.findMany({
    where: { employeeId: session.employeeId, simulationId },
    orderBy: { completedAt: "asc" },
  });
  const bestPriorScore = priorAttempts.length ? Math.max(...priorAttempts.map((a) => a.score)) : null;

  await prisma.simulationAttempt.create({
    data: {
      employeeId: session.employeeId,
      simulationId,
      score: evaluation.score,
      feedback: evaluation.feedback,
      dimensions: evaluation.dimensions,
      decisionChoiceId: input.decisionChoiceId ?? undefined,
      evaluationChoices: input.evaluationChoices,
      passed: evaluation.passed,
    },
  });

  const organizationId = session.organizationId!;
  const isFirstAttempt = priorAttempts.length === 0;

  await awardPoints({
    employeeId: session.employeeId,
    organizationId,
    ruleKey: "simulation_completed",
    reason: `Completed simulation: ${simulation.title}`,
    entityType: "Simulation",
    entityId: simulationId,
  });

  if (evaluation.passed && (isFirstAttempt || !priorAttempts.some((a) => a.passed))) {
    await awardPoints({
      employeeId: session.employeeId,
      organizationId,
      ruleKey: "simulation_passed",
      reason: `Passed simulation: ${simulation.title}`,
      entityType: "Simulation",
      entityId: simulationId,
      dedupeKey: `simulation_passed:${simulationId}`,
    });
  }
  if (evaluation.score >= 90 && !priorAttempts.some((a) => a.score >= 90)) {
    await awardPoints({
      employeeId: session.employeeId,
      organizationId,
      ruleKey: "simulation_score_90",
      reason: `Scored 90+ on: ${simulation.title}`,
      entityType: "Simulation",
      entityId: simulationId,
      dedupeKey: `simulation_score_90:${simulationId}`,
    });
  }
  if (bestPriorScore !== null && evaluation.score - bestPriorScore >= 15) {
    await awardPoints({
      employeeId: session.employeeId,
      organizationId,
      ruleKey: "simulation_improved_15",
      reason: `Improved score by ${evaluation.score - bestPriorScore} points on: ${simulation.title}`,
      entityType: "Simulation",
      entityId: simulationId,
    });
  }

  await checkAndAwardCertifications(session.employeeId);

  const recommendedLesson = await getRecommendedLessonForWeakestDimension(session.employeeId, evaluation.dimensions);

  revalidatePath(`/dashboard/learn/simulations/${simulationId}`);
  return { ...evaluation, expertApproach: simulation.expertApproach, recommendedLesson };
}
