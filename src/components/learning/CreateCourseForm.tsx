"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createCustomCourse } from "@/lib/actions/customLearning";

export function CreateCourseForm({
  lockDepartment,
  departmentOptions,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(createCustomCourse, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.courseId) router.push(`/dashboard/learn/manage/${state.courseId}`);
  }, [state?.courseId, router]);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-ink-600">Course title</label>
        <input
          name="title"
          required
          placeholder="e.g. Using Copilot for Claims Notes"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Description</label>
        <textarea
          name="description"
          required
          rows={2}
          placeholder="What will your team be able to do after this course?"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      {lockDepartment ? (
        <input type="hidden" name="department" value={lockDepartment} />
      ) : (
        <div>
          <label className="block text-xs font-medium text-ink-600">Department</label>
          <select
            name="department"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="" disabled>
              Select…
            </option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      )}
      {lockDepartment && <p className="text-xs text-ink-400">For your team: {lockDepartment}</p>}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create course"}
      </button>
    </form>
  );
}
