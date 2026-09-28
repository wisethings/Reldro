"use client";

import { useActionState } from "react";
import { createTemplate } from "@/lib/actions/templates";
import { ToolMultiSelect } from "@/components/ui/ToolMultiSelect";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

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
      <FieldGrid columns={2}>
        <Field label="Template title" required>
          <Input name="title" placeholder="e.g. Draft a renewal outreach email" required />
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
            <Select name="department" required defaultValue="">
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
        <Textarea name="prompt" placeholder="The AI prompt itself..." required rows={4} className="font-mono text-xs" />
      </Field>
      <Field label="Tool this prompt is for" optional>
        <ToolMultiSelect name="tools" options={toolOptions} />
      </Field>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Adding…" : "Add template"}
      </button>
    </form>
  );
}
