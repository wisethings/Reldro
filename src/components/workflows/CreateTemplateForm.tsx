"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTemplate, updateTemplate } from "@/lib/actions/templates";
import { ToolMultiSelect } from "@/components/ui/ToolMultiSelect";
import { ImageAttachField } from "@/components/learning/ImageAttachField";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

export function CreateTemplateForm({
  lockDepartment,
  departmentOptions,
  toolOptions,
  template,
  onSaved,
}: {
  lockDepartment: string | null;
  departmentOptions: string[];
  toolOptions: string[];
  template?: { id: string; title: string; prompt: string; department: string; tools: string[]; imageUrl: string | null; videoUrl: string | null };
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(template ? updateTemplate : createTemplate, undefined);
  const router = useRouter();
  useEffect(() => {
    if (template && state?.success) {
      router.refresh();
      onSaved?.();
    }
  }, [template, state?.success, router, onSaved]);

  return (
    <form action={formAction} className="space-y-3">
      {template && <input type="hidden" name="templateId" value={template.id} />}
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
      <FieldGrid columns={2}>
        <Field label="Template title" required>
          <Input name="title" placeholder="e.g. Draft a renewal outreach email" required defaultValue={template?.title} />
        </Field>
        {lockDepartment ? (
          <>
            <input type="hidden" name="department" value={lockDepartment} />
            <Field label="Department" hint={`For ${lockDepartment}`}>
              <Input value={lockDepartment} disabled />
            </Field>
          </>
        ) : (
          <Field label="Department" required>
            <Select name="department" required defaultValue={template?.department ?? ""}>
              <option value="" disabled>
                Choose a department
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
      <Field label="Prompt" required>
        <Textarea name="prompt" placeholder="The AI prompt itself..." required rows={4} className="font-mono text-xs" defaultValue={template?.prompt} />
      </Field>
      <Field label="Tool this prompt is for" optional>
        <ToolMultiSelect name="tools" options={toolOptions} defaultValue={template?.tools} />
      </Field>
      <FieldGrid columns={2}>
        <ImageAttachField name="imageUrl" defaultValue={template?.imageUrl} label="Example output" hint="Optional. A screenshot of the AI output this prompt produces, so your team can see the outcome before trying it." />
        <Field label="Video link" hint="YouTube, Loom, or Vimeo link to embed" optional>
          <Input name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=…" defaultValue={template?.videoUrl ?? ""} />
        </Field>
      </FieldGrid>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Saving…" : template ? "Save changes" : "Add template"}
      </button>
    </form>
  );
}
