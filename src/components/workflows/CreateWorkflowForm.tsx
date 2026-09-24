"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCustomWorkflow } from "@/lib/actions/customWorkflows";

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function CreateWorkflowForm({
  lockDepartment,
  departmentOptions,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(createCustomWorkflow, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.workflowId) router.push(`/dashboard/workflows/manage/${state.workflowId}`);
  }, [state?.workflowId, router]);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Workflow title">
        <input name="title" required placeholder="e.g. Drafting renewal quotes with AI" className={inputClass} />
      </Field>

      {lockDepartment ? (
        <input type="hidden" name="department" value={lockDepartment} />
      ) : (
        <Field label="Department">
          <select name="department" required defaultValue="" className={`${inputClass} bg-white`}>
            <option value="" disabled>
              Select…
            </option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      )}
      {lockDepartment && <p className="text-xs text-ink-400">For your team: {lockDepartment}</p>}

      <Field label="Summary" hint="One or two sentences describing this workflow">
        <textarea name="summary" required rows={2} className={inputClass} />
      </Field>

      <Field label="Current process" hint="How the team does this today, without AI">
        <textarea name="currentProcess" required rows={3} className={inputClass} />
      </Field>

      <Field label="AI-enabled process" hint="How the team does this with AI">
        <textarea name="aiProcess" required rows={3} className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Difficulty">
          <select name="difficulty" defaultValue="MEDIUM" className={`${inputClass} bg-white`}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </Field>
        <Field label="Skill level">
          <input name="skillLevel" defaultValue="Intermediate" className={inputClass} />
        </Field>
        <Field label="Time saved (min/day)">
          <input name="timeSavedMinutes" type="number" min={0} defaultValue={15} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tools required" hint="Comma-separated, e.g. ChatGPT, Salesforce">
          <input name="toolsRequired" placeholder="Optional" className={inputClass} />
        </Field>
        <Field label="Skills required" hint="Comma-separated">
          <input name="skillsRequired" placeholder="Optional" className={inputClass} />
        </Field>
      </div>

      <Field label="Security considerations">
        <textarea name="securityNotes" rows={2} placeholder="Optional" className={inputClass} />
      </Field>
      <Field label="Training requirements">
        <textarea name="trainingNotes" rows={2} placeholder="Optional" className={inputClass} />
      </Field>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create workflow"}
      </button>
    </form>
  );
}
