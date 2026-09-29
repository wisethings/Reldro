"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createCustomCourse, updateCustomCourse } from "@/lib/actions/customLearning";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

export function CreateCourseForm({
  lockDepartment,
  departmentOptions,
  course,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
  course?: { id: string; title: string; description: string; department: string };
}) {
  const [state, formAction, pending] = useActionState(course ? updateCustomCourse : createCustomCourse, undefined);
  const router = useRouter();

  useEffect(() => {
    if (!state?.courseId) return;
    if (course) router.refresh();
    else router.push(`/dashboard/learn/manage/${state.courseId}`);
  }, [state, course, router]);

  return (
    <form action={formAction} className="space-y-3">
      {course && <input type="hidden" name="courseId" value={course.id} />}
      <FieldGrid columns={2}>
        <Field label="Course title" required>
          <Input name="title" required placeholder="e.g. Using Copilot for Claims Notes" defaultValue={course?.title} />
        </Field>
        {lockDepartment ? (
          <>
            <input type="hidden" name="department" value={lockDepartment} />
            <Field label="Department">
              <Input value={lockDepartment} disabled />
            </Field>
          </>
        ) : (
          <Field label="Department" required>
            <Select name="department" required defaultValue={course?.department ?? ""}>
              <option value="" disabled>
                Select…
              </option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </FieldGrid>
      <Field label="Description" required>
        <Textarea name="description" required rows={2} placeholder="What will your team be able to do after this course?" defaultValue={course?.description} />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {course && state?.success && <p className="text-sm text-sage-deep">{state.success}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : course ? "Save changes" : "Create course"}
      </button>
    </form>
  );
}
