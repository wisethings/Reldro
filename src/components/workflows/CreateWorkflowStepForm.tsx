"use client";

import { useActionState } from "react";
import { createWorkflowStep } from "@/lib/actions/customWorkflows";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function CreateWorkflowStepForm({ workflowId }: { workflowId: string }) {
  const [state, formAction, pending] = useActionState(createWorkflowStep, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workflowId" value={workflowId} />
      <div>
        <label className="block text-xs font-medium text-ink-600">Step title</label>
        <input name="title" required placeholder="e.g. Draft the first version with AI" className={`mt-1 ${inputClass}`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Description</label>
        <textarea name="description" required rows={2} className={`mt-1 ${inputClass}`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Example AI prompt</label>
        <textarea name="aiPrompt" rows={2} placeholder="Optional" className={`mt-1 ${inputClass}`} />
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
        <input type="checkbox" name="humanCheckpoint" />
        This step needs human review before moving on
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep">{state.success}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add step"}
      </button>
    </form>
  );
}
