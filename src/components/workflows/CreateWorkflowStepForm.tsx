"use client";

import { useActionState } from "react";
import { createWorkflowStep } from "@/lib/actions/customWorkflows";
import { ImageAttachField } from "@/components/learning/ImageAttachField";
import { Field, FieldGrid, Input, Textarea } from "@/components/ui/Field";

export function CreateWorkflowStepForm({ workflowId }: { workflowId: string }) {
  const [state, formAction, pending] = useActionState(createWorkflowStep, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workflowId" value={workflowId} />
      <Field label="Step title" required>
        <Input name="title" required placeholder="e.g. Draft the first version with AI" />
      </Field>
      <FieldGrid columns={2}>
        <Field label="Description" required>
          <Textarea name="description" required rows={2} />
        </Field>
        <Field label="Example AI prompt" optional>
          <Textarea name="aiPrompt" rows={2} />
        </Field>
      </FieldGrid>
      <FieldGrid columns={2}>
        <ImageAttachField name="imageUrl" label="Screenshot or diagram" />
        <Field label="Video link" hint="YouTube, Loom, or Vimeo link to embed" optional>
          <Input name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=…" />
        </Field>
      </FieldGrid>
      <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
        <input type="checkbox" name="humanCheckpoint" className="rounded border-ink-300 text-brand-700 focus:ring-brand-500" />
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
