"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCustomWorkflow } from "@/lib/actions/customWorkflows";
import { ToolMultiSelect } from "@/components/ui/ToolMultiSelect";
import { Field, FieldGrid, FieldSection, Input, Select, Textarea } from "@/components/ui/Field";

export function CreateWorkflowForm({
  lockDepartment,
  departmentOptions,
  toolOptions,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
  toolOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(createCustomWorkflow, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.workflowId) router.push(`/dashboard/workflows/manage/${state.workflowId}`);
  }, [state?.workflowId, router]);

  return (
    <form action={formAction} className="space-y-4">
      <FieldSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <Field label="Workflow title" required>
            <Input name="title" required placeholder="e.g. Drafting renewal quotes with AI" />
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
              <Select name="department" required defaultValue="">
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
          <Field label="Difficulty">
            <Select name="difficulty" defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </Field>
          <Field label="Time saved" hint="min/day">
            <Input name="timeSavedMinutes" type="number" min={0} defaultValue={15} />
          </Field>
        </div>
      </FieldSection>

      <FieldSection title="The process">
        <Field label="Summary" hint="One or two sentences describing this workflow" required>
          <Textarea name="summary" required rows={2} />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Current process" hint="How the team does this today, without AI" required>
            <Textarea name="currentProcess" required rows={3} />
          </Field>
          <Field label="AI-enabled process" hint="How the team does this with AI" required>
            <Textarea name="aiProcess" required rows={3} />
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Requirements">
        <FieldGrid columns={2}>
          <Field label="Tools required" hint="From your Tool Library">
            <ToolMultiSelect name="toolsRequired" options={toolOptions} />
          </Field>
          <Field label="Skills required" hint="Comma-separated" optional>
            <Input name="skillsRequired" placeholder="e.g. Prompt writing, Data hygiene" />
          </Field>
        </FieldGrid>
        <Field label="Skill level">
          <Input name="skillLevel" defaultValue="Intermediate" />
        </Field>
      </FieldSection>

      <FieldSection title="Notes">
        <FieldGrid columns={2}>
          <Field label="Security considerations" optional>
            <Textarea name="securityNotes" rows={2} placeholder="Anything to flag before rollout" />
          </Field>
          <Field label="Training requirements" optional>
            <Textarea name="trainingNotes" rows={2} placeholder="What employees should learn first" />
          </Field>
        </FieldGrid>
      </FieldSection>

      <div className="space-y-2 border-t border-ink-100 pt-4">
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          disabled={pending}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create workflow"}
        </button>
      </div>
    </form>
  );
}
