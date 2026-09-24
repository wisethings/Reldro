"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomCourse } from "@/lib/actions/customLearning";

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this course and all its lessons? This can't be undone.")) {
          startTransition(async () => {
            await deleteCustomCourse(courseId);
            router.push("/dashboard/learn/manage");
          });
        }
      }}
      className="shrink-0 rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete course"}
    </button>
  );
}
