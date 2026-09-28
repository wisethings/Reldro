"use client";

import { useActionState } from "react";
import { createTemplate } from "@/lib/actions/templates";
import { ToolMultiSelect } from "@/components/ui/ToolMultiSelect";

export function CreateTemplateForm({
  lockDepartment,
  departmentOptions,
  toolOptions,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
  toolOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(createTemplate, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="title" placeholder="Template title" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm" />
        {lockDepartment ? (
          <input type="hidden" name="department" value={lockDepartment} />
        ) : (
          <select name="department" required defaultValue="" className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm">
            <option value="" disabled>
              Choose a department
            </option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>
      {lockDepartment && <p className="text-xs text-ink-500">For {lockDepartment}.</p>}
      <textarea
        name="prompt"
        placeholder="The AI prompt itself..."
        required
        rows={4}
        className="w-full rounded-lg border border-ink-300 px-3 py-2 font-mono text-xs"
      />
      <div>
        <label className="block text-xs font-medium text-ink-600">Tool this prompt is for</label>
        <div className="mt-1">
          <ToolMultiSelect name="tools" options={toolOptions} />
        </div>
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Adding…" : "Add template"}
      </button>
    </form>
  );
}
