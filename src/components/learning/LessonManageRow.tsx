"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteCustomLesson } from "@/lib/actions/customLearning";
import type { Lesson } from "@prisma/client";

export function LessonManageRow({ lesson, courseId }: { lesson: Lesson; courseId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <Link href={`/dashboard/learn/lessons/${lesson.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-orchid-deep">
          {lesson.title}
        </Link>
        <p className="text-xs text-ink-500">{lesson.durationMin} min{lesson.knowledgeCheckQuestion ? " · has knowledge check" : ""}</p>
      </div>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Remove this lesson? This can't be undone.")) startTransition(() => deleteCustomLesson(lesson.id, courseId));
        }}
        className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}
