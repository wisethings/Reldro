import "server-only";
import { prisma } from "@/lib/prisma";
import { pickIllustration } from "@/lib/data/illustrations";

/**
 * One-off, idempotent (re)assignment of the global catalog's illustration
 * images. Unlike prisma/seed.ts (which wipes and recreates everything),
 * this only touches the shared global catalog (organizationId null) - never
 * a team-authored workflow/course, whose own imageUrl an admin may have
 * deliberately set (including to nothing).
 *
 * Deliberately recomputes every row rather than only filling in nulls: the
 * matching keywords/categories in illustrations.ts evolve (new categories
 * get added, existing ones get better keyword coverage), and a row that
 * matched the generic "ai-spark" fallback under an older, narrower keyword
 * set should pick up a more specific illustration once one exists - not
 * stay stuck with its first-ever assignment forever.
 */
export async function patchDemoMedia() {
  const steps = await prisma.workflowStep.findMany({
    where: { workflow: { organizationId: null } },
    select: { id: true, title: true, description: true, imageUrl: true, workflow: { select: { title: true } } },
  });
  let stepsChanged = 0;
  for (const step of steps) {
    const imageUrl = pickIllustration(`${step.title} ${step.description} ${step.workflow.title}`);
    if (imageUrl !== step.imageUrl) stepsChanged++;
    await prisma.workflowStep.update({ where: { id: step.id }, data: { imageUrl } });
  }

  const lessons = await prisma.lesson.findMany({
    where: { course: { organizationId: null } },
    select: { id: true, title: true, imageUrl: true, course: { select: { title: true, skills: true } } },
  });
  let lessonsChanged = 0;
  for (const lesson of lessons) {
    const imageUrl = pickIllustration(`${lesson.title} ${lesson.course.title} ${lesson.course.skills.join(" ")}`);
    if (imageUrl !== lesson.imageUrl) lessonsChanged++;
    await prisma.lesson.update({ where: { id: lesson.id }, data: { imageUrl } });
  }

  return { stepsTotal: steps.length, stepsChanged, lessonsTotal: lessons.length, lessonsChanged };
}
