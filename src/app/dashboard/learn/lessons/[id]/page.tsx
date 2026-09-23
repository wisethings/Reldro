import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { completeLesson } from "@/lib/actions/learning";
import { AudioNarration } from "@/components/learning/AudioNarration";
import { LessonJourney } from "@/components/learning/LessonJourney";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { course: true } });
  if (!lesson) notFound();

  const completed = session.employeeId
    ? await prisma.lessonCompletion.findUnique({
        where: { employeeId_lessonId: { employeeId: session.employeeId, lessonId: id } },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard/learn" className="text-xs font-medium text-ink-500 hover:text-ink-800">
        ← Back to Learn
      </Link>
      <div>
        <p className="text-xs font-medium text-orchid-deep">{lesson.course.title}</p>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">{lesson.title}</h1>
        <p className="text-xs text-ink-500">{lesson.durationMin} min</p>
        <LessonJourney activeIndex={3} />
      </div>

      <Card>
        <CardHeader title="Concept" action={<AudioNarration text={lesson.concept} />} />
        <CardBody>
          <p className="text-sm text-ink-700">{lesson.concept}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Example" action={<AudioNarration text={lesson.example} />} />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.example}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Try it: practice exercise" action={<AudioNarration text={lesson.exercise} />} />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.exercise}</p>
        </CardBody>
      </Card>

      {session.employeeId && (
        <form action={completeLesson.bind(null, lesson.id)}>
          <button
            className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            disabled={Boolean(completed)}
          >
            {completed ? "Completed ✓" : "Mark lesson complete"}
          </button>
        </form>
      )}
    </div>
  );
}
