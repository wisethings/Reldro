"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteCustomLesson } from "@/lib/actions/customLearning";
import { Modal } from "@/components/ui/Modal";
import { CreateLessonForm } from "./CreateLessonForm";
import type { Lesson } from "@prisma/client";

export function LessonManageRow({ lesson, courseId }: { lesson: Lesson; courseId: string }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <Link href={`/dashboard/learn/lessons/${lesson.id}`} className="truncate text-sm font-medium text-ink-900 hover:text-orchid-deep">
          {lesson.title}
        </Link>
        <p className="text-xs text-ink-500">{lesson.durationMin} min{lesson.knowledgeCheckQuestion ? " · has knowledge check" : ""}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-orchid-deep hover:underline">
          Edit
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Remove this lesson? This can't be undone.")) startTransition(() => deleteCustomLesson(lesson.id, courseId));
          }}
          className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {editing && (
        <Modal title="Edit lesson" onClose={() => setEditing(false)}>
          <CreateLessonForm courseId={courseId} lesson={lesson} onSaved={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
