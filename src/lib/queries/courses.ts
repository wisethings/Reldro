import "server-only";
import { prisma } from "@/lib/prisma";
import { COURSE_CATALOG } from "@/lib/courseCatalog";

/**
 * Idempotent - safe to call on every page load. Only creates courses that
 * don't already exist by title (relies on Course.title being unique), same
 * pattern as ensureGlobalToolCatalog()/ensureSimulationCatalog(). Existing
 * organizations pick up new learning paths without a full reseed.
 */
export async function ensureCourseCatalog() {
  const existingTitles = new Set((await prisma.course.findMany({ select: { title: true } })).map((c) => c.title));
  const missing = COURSE_CATALOG.filter((c) => !existingTitles.has(c.title));
  if (missing.length === 0) return;

  for (const c of missing) {
    const workflow = await prisma.workflow.findFirst({ where: { title: c.workflowTitle }, select: { id: true } });
    await prisma.course.create({
      data: {
        title: c.title,
        description: c.description,
        department: c.department,
        workflowId: workflow?.id,
        role: c.role,
        skills: c.skills,
        tools: c.tools,
        lessons: {
          create: c.lessons.map((l, i) => ({ order: i + 1, ...l })),
        },
      },
    });
  }
}
