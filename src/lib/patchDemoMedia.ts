import "server-only";
import { prisma } from "@/lib/prisma";
import { pickIllustration } from "@/lib/data/illustrations";

/**
 * One-off, idempotent backfill for the global catalog's illustration
 * images. Unlike prisma/seed.ts (which wipes and recreates everything),
 * this only fills in `imageUrl` on rows that don't already have one, and
 * only on the shared global catalog (organizationId null) - never touches
 * a team-authored workflow/course, whose own imageUrl an admin may have
 * deliberately set (including to nothing).
 */
export async function patchDemoMedia() {
  const steps = await prisma.workflowStep.findMany({
    where: { imageUrl: null, workflow: { organizationId: null } },
    select: { id: true, title: true, description: true },
  });
  for (const step of steps) {
    await prisma.workflowStep.update({
      where: { id: step.id },
      data: { imageUrl: pickIllustration(`${step.title} ${step.description}`) },
    });
  }

  const lessons = await prisma.lesson.findMany({
    where: { imageUrl: null, course: { organizationId: null } },
    select: { id: true, title: true, course: { select: { skills: true } } },
  });
  for (const lesson of lessons) {
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { imageUrl: pickIllustration(`${lesson.title} ${lesson.course.skills.join(" ")}`) },
    });
  }

  return { stepsPatched: steps.length, lessonsPatched: lessons.length };
}
