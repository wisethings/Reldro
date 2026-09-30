"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAction } from "@/lib/actions/safetyActions";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function ActionForm({
  reportId,
  people,
  severities,
  isSafetyTeam,
  defaultTitle = "",
}: {
  reportId: string | null;
  people: { id: string; name: string }[];
  severities: { key: string; label: string }[];
  isSafetyTeam: boolean;
  defaultTitle?: string;
}) {
  const [state, formAction, pending] = useActionState(createAction, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3" key={state?.success ? "done" : "form"}>
      {reportId && <input type="hidden" name="reportId" value={reportId} />}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
      <Field label="What needs to change?" required>
        <Input name="title" defaultValue={defaultTitle} required placeholder="e.g. Install guardrail at level 3 floor opening" />
      </Field>
      <Field label="Details" optional>
        <Textarea name="description" rows={2} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Owner">
          <Select name="ownerId" defaultValue="">
            <option value="">No owner</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Due date">
          <Input name="dueDate" type="date" />
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue="MEDIUM">
            {severities.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
        {pending ? "Saving…" : isSafetyTeam ? "Create corrective action" : "Propose corrective action"}
      </button>
      {!isSafetyTeam && <p className="text-[11px] text-ink-500">The safety team reviews a proposed corrective action before work starts.</p>}
    </form>
  );
}
