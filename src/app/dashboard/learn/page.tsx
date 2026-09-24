import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { ensureSimulationCatalog } from "@/lib/queries/simulations";
import { ensureCourseCatalog } from "@/lib/queries/courses";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function LearnPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  await Promise.all([ensureSimulationCatalog(), ensureCourseCatalog()]);

  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
    : null;
  const canAuthorLessons = session.role === "COMPANY_ADMIN" || Boolean(employee?.isDepartmentAdmin);

  const [courses, simulations, completions, attempts] = await Promise.all([
    prisma.course.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: session.organizationId }] },
      include: { lessons: true },
      orderBy: { department: "asc" },
    }),
    prisma.simulation.findMany(),
    session.employeeId ? prisma.lessonCompletion.findMany({ where: { employeeId: session.employeeId } }) : Promise.resolve([]),
    session.employeeId ? prisma.simulationAttempt.findMany({ where: { employeeId: session.employeeId } }) : Promise.resolve([]),
  ]);

  const completedLessonIds = new Set(completions.map((c) => c.lessonId));
  const bestAttemptBySim = new Map<string, number>();
  for (const a of attempts) {
    bestAttemptBySim.set(a.simulationId, Math.max(bestAttemptBySim.get(a.simulationId) ?? 0, a.score));
  }

  const relevant = employee?.department
    ? [...courses].sort((a, b) => (a.department === employee.department!.name ? -1 : 1) - (b.department === employee.department!.name ? -1 : 1))
    : courses;

  const byDepartment = new Map<string, typeof courses>();
  for (const c of relevant) byDepartment.set(c.department, [...(byDepartment.get(c.department) ?? []), c]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Learn</h1>
          <p className="text-sm text-ink-500">
            Short, practical lessons tied directly to real workflows — not generic AI training.
          </p>
        </div>
        {canAuthorLessons && (
          <Link
            href="/dashboard/learn/manage"
            className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            Create a lesson for your team
          </Link>
        )}
      </div>

      {[...byDepartment.entries()].map(([dept, items]) => (
        <div key={dept}>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{dept}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((course) => {
              const done = course.lessons.filter((l) => completedLessonIds.has(l.id)).length;
              const pct = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
              return (
                <Card key={course.id}>
                  <CardHeader
                    title={course.title}
                    subtitle={course.description}
                    action={
                      course.organizationId ? (
                        <Badge tone="brand" className="whitespace-normal text-left">
                          Team-authored{course.createdByName ? ` · ${course.createdByName}` : ""}
                        </Badge>
                      ) : course.role ? (
                        <Badge tone="neutral" className="whitespace-normal text-left">
                          For: {course.role}
                        </Badge>
                      ) : undefined
                    }
                  />
                  <CardBody>
                    {course.tools.length > 0 && (
                      <p className="mb-3 text-xs text-ink-500">Tools: {course.tools.join(", ")}</p>
                    )}
                    {session.employeeId && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-ink-500">
                          <span>{done}/{course.lessons.length} lessons</span>
                          <span>{pct}%</span>
                        </div>
                        <ProgressBar value={pct} className="mt-1" />
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {course.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <Link
                            href={`/dashboard/learn/lessons/${lesson.id}`}
                            className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-ink-50"
                          >
                            <span className={completedLessonIds.has(lesson.id) ? "text-ink-400 line-through" : "text-ink-700"}>
                              {lesson.title}
                            </span>
                            <span className="text-xs text-ink-400">{lesson.durationMin} min</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-800">AI simulations</h2>
        <p className="mb-3 text-xs text-ink-500">Realistic professional scenarios, not games — practice before you implement.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {simulations.map((sim) => (
            <Link key={sim.id} href={`/dashboard/learn/simulations/${sim.id}`}>
              <Card className="h-full hover:border-brand-300">
                <CardBody>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{sim.title}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <Badge>{sim.department}</Badge>
                      <Badge tone={DIFFICULTY_TONE[sim.difficulty]}>{sim.difficulty.toLowerCase()}</Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{sim.description}</p>
                  {bestAttemptBySim.has(sim.id) && (
                    <p className="mt-2 text-xs font-medium text-orchid-deep">Best score: {bestAttemptBySim.get(sim.id)}/100</p>
                  )}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
