import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { completeLesson } from "@/lib/actions/learning";
import { AudioNarration } from "@/components/learning/AudioNarration";
import { LessonJourney } from "@/components/learning/LessonJourney";
import { KnowledgeCheck } from "@/components/learning/KnowledgeCheck";
import { toEmbedUrl } from "@/lib/videoEmbed";

const LESSON_TYPE_LABEL: Record<string, string> = {
  CONCEPT: "Concept",
  DEMONSTRATION: "Demonstration",
  INTERACTIVE_EXERCISE: "Interactive exercise",
  TOOL_PRACTICE: "Tool practice",
  PROMPT_EXERCISE: "Prompt exercise",
  DECISION_EXERCISE: "Decision exercise",
  KNOWLEDGE_CHECK: "Knowledge check",
  REFLECTION: "Reflection",
  WORKFLOW_PRACTICE: "Workflow practice",
};

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  // A lesson's course is either the shared global catalog (organizationId
  // null) or a team-authored one scoped to its own org - without this, any
  // org could load another org's private lesson content just by knowing an
  // id, including via a leaked recommendation link.
  const lesson = await prisma.lesson.findFirst({
    where: { id, course: { OR: [{ organizationId: null }, { organizationId: session.organizationId }] } },
    include: { course: true },
  });
  if (!lesson) notFound();

  const [completed, nextLesson] = await Promise.all([
    session.employeeId
      ? prisma.lessonCompletion.findUnique({
          where: { employeeId_lessonId: { employeeId: session.employeeId, lessonId: id } },
        })
      : null,
    prisma.lesson.findFirst({ where: { courseId: lesson.courseId, order: { gt: lesson.order } }, orderBy: { order: "asc" } }),
  ]);

  const hasKnowledgeCheck = lesson.knowledgeCheckQuestion && lesson.knowledgeCheckOptions.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard/learn" className="text-xs font-medium text-ink-500 hover:text-ink-800">
        ← Back to Learn
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-orchid-deep">{lesson.course.title}</p>
          <Badge tone="neutral">{LESSON_TYPE_LABEL[lesson.type] ?? lesson.type}</Badge>
        </div>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">{lesson.title}</h1>
        <p className="text-xs text-ink-500">{lesson.durationMin} min</p>
        <LessonJourney activeIndex={3} />
      </div>

      {lesson.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lesson.imageUrl} alt="" className="w-full rounded-lg border border-ink-200" />
      )}

      {lesson.videoUrl && (
        (() => {
          const embedUrl = toEmbedUrl(lesson.videoUrl);
          return embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg border border-ink-200">
              <iframe src={embedUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={lesson.title} />
            </div>
          ) : (
            <a
              href={lesson.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-ink-200 px-4 py-3 text-sm font-medium text-orchid-deep hover:bg-ink-50"
            >
              Watch video ↗
            </a>
          );
        })()
      )}

      {lesson.objective && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="text-xs font-medium text-ink-500">Objective</p>
          <p className="mt-1 text-sm text-ink-800">{lesson.objective}</p>
        </div>
      )}
      {lesson.whyItMatters && (
        <div>
          <p className="text-xs font-medium text-ink-500">Why it matters</p>
          <p className="mt-1 text-sm text-ink-700">{lesson.whyItMatters}</p>
        </div>
      )}

      <Card>
        <CardHeader title="Learn" action={<AudioNarration text={lesson.concept} />} />
        <CardBody>
          <p className="text-sm text-ink-700">{lesson.concept}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="See it" action={<AudioNarration text={lesson.example} />} />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.example}</p>
        </CardBody>
      </Card>
      {lesson.tryItPrompt && (
        <Card>
          <CardHeader title="Try it" action={<AudioNarration text={lesson.tryItPrompt} />} />
          <CardBody>
            <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.tryItPrompt}</p>
          </CardBody>
        </Card>
      )}
      {lesson.evaluatePrompt && (
        <Card>
          <CardHeader title="Evaluate" action={<AudioNarration text={lesson.evaluatePrompt} />} />
          <CardBody>
            <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.evaluatePrompt}</p>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader title="Apply" action={<AudioNarration text={lesson.exercise} />} />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{lesson.exercise}</p>
        </CardBody>
      </Card>

      {hasKnowledgeCheck && session.employeeId && (
        <Card>
          <CardHeader title="Knowledge check" />
          <CardBody>
            <KnowledgeCheck
              lessonId={lesson.id}
              question={lesson.knowledgeCheckQuestion}
              options={lesson.knowledgeCheckOptions}
              alreadyCompleted={Boolean(completed)}
            />
          </CardBody>
        </Card>
      )}

      {lesson.takeaway && (
        <div className="rounded-lg border border-orchid-soft bg-orchid-soft/40 p-4">
          <p className="text-sm font-medium text-orchid-deep">Takeaway</p>
          <p className="mt-1 text-sm text-ink-800">{lesson.takeaway}</p>
        </div>
      )}

      {session.employeeId && !hasKnowledgeCheck && (
        <form action={completeLesson.bind(null, lesson.id, undefined)}>
          <button
            className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            disabled={Boolean(completed)}
          >
            {completed ? "Completed ✓" : "Mark lesson complete"}
          </button>
        </form>
      )}

      {nextLesson && (
        <Link
          href={`/dashboard/learn/lessons/${nextLesson.id}`}
          className="block rounded-lg border border-ink-200 p-4 text-sm hover:border-orchid-300"
        >
          <p className="text-xs text-ink-500">Next step</p>
          <p className="mt-1 font-medium text-orchid-deep">{nextLesson.title} →</p>
        </Link>
      )}
    </div>
  );
}
