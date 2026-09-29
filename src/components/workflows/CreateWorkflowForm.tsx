"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCustomWorkflow, updateCustomWorkflow } from "@/lib/actions/customWorkflows";
import { ToolMultiSelect } from "@/components/ui/ToolMultiSelect";
import { Field, FieldGrid, FieldSection, Input, Select, Textarea } from "@/components/ui/Field";

export function CreateWorkflowForm({
  lockDepartment,
  departmentOptions,
  toolOptions,
  workflow,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
  toolOptions: string[];
  workflow?: {
    id: string;
    title: string;
    department: string;
    difficulty: string;
    timeSavedMinutes: number;
    summary: string;
    currentProcess: string;
    aiProcess: string;
    toolsRequired: string[];
    skillsRequired: string[];
    skillLevel: string;
    securityNotes: string | null;
    trainingNotes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(workflow ? updateCustomWorkflow : createCustomWorkflow, undefined);
  const router = useRouter();

  useEffect(() => {
    if (!state?.workflowId) return;
    if (workflow) router.refresh();
    else router.push(`/dashboard/workflows/manage/${state.workflowId}`);
  }, [state, workflow, router]);

  return (
    <form action={formAction} className="space-y-4">
      {workflow && <input type="hidden" name="workflowId" value={workflow.id} />}
      <FieldSection>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <Field label="Workflow title" required>
            <Input name="title" required placeholder="e.g. Drafting renewal quotes with AI" defaultValue={workflow?.title} />
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
              <Select name="department" required defaultValue={workflow?.department ?? ""}>
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
            <Select name="difficulty" defaultValue={workflow?.difficulty ?? "MEDIUM"}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </Field>
          <Field label="Time saved" hint="min/day">
            <Input name="timeSavedMinutes" type="number" min={0} defaultValue={workflow?.timeSavedMinutes ?? 15} />
          </Field>
        </div>
      </FieldSection>

      <FieldSection title="The process">
        <Field label="Summary" hint="One or two sentences describing this workflow" required>
          <Textarea name="summary" required rows={2} defaultValue={workflow?.summary} />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Current process" hint="How the team does this today, without AI" required>
            <Textarea name="currentProcess" required rows={3} defaultValue={workflow?.currentProcess} />
          </Field>
          <Field label="AI-enabled process" hint="How the team does this with AI" required>
            <Textarea name="aiProcess" required rows={3} defaultValue={workflow?.aiProcess} />
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Requirements">
        <FieldGrid columns={2}>
          <Field label="Tools required" hint="From your Tool Library">
            <ToolMultiSelect name="toolsRequired" options={toolOptions} defaultValue={workflow?.toolsRequired} />
          </Field>
          <Field label="Skills required" hint="Comma-separated" optional>
            <Input name="skillsRequired" placeholder="e.g. Prompt writing, Data hygiene" defaultValue={workflow?.skillsRequired.join(", ")} />
          </Field>
        </FieldGrid>
        <Field label="Skill level">
          <Input name="skillLevel" defaultValue={workflow?.skillLevel ?? "Intermediate"} />
        </Field>
      </FieldSection>

      <FieldSection title="Notes">
        <FieldGrid columns={2}>
          <Field label="Security considerations" optional>
            <Textarea name="securityNotes" rows={2} placeholder="Anything to flag before rollout" defaultValue={workflow?.securityNotes ?? ""} />
          </Field>
          <Field label="Training requirements" optional>
            <Textarea name="trainingNotes" rows={2} placeholder="What employees should learn first" defaultValue={workflow?.trainingNotes ?? ""} />
          </Field>
        </FieldGrid>
      </FieldSection>

      <div className="space-y-2 border-t border-ink-100 pt-4">
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {workflow && state?.success && <p className="text-sm text-sage-deep">{state.success}</p>}
        <button
          disabled={pending}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : workflow ? "Save changes" : "Create workflow"}
        </button>
      </div>
    </form>
  );
}
