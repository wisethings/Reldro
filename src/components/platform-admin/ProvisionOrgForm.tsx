"use client";

import { useActionState } from "react";
import { provisionOrganization } from "@/lib/actions/platform-admin";
import { Field, FieldGrid, FieldSection, Input } from "@/components/ui/Field";
import { InviteResult } from "@/components/team/InviteResult";

export function ProvisionOrgForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(provisionOrganization, undefined);

  if (state?.emailSent || state?.tempPassword) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-ink-900">Workspace created.</p>
        <InviteResult result={state} />
        {onDone && (
          <button onClick={onDone} className="text-xs font-medium text-orchid-deep hover:text-oxblood">
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <FieldSection title="Company">
        <FieldGrid columns={2}>
          <Field label="Company name" required>
            <Input name="companyName" required />
          </Field>
          <Field label="Industry" optional>
            <Input name="industry" placeholder="Commercial electrical contracting" />
          </Field>
          <Field label="Headcount" optional>
            <Input name="size" placeholder="e.g. 85" />
          </Field>
          <Field label="Geography" optional>
            <Input name="geography" placeholder="Chicago metro" />
          </Field>
        </FieldGrid>
      </FieldSection>
      <FieldSection title="Admin">
        <FieldGrid columns={2}>
          <Field label="Admin name" required>
            <Input name="adminName" required />
          </Field>
          <Field label="Admin email" required>
            <Input name="adminEmail" type="email" required />
          </Field>
        </FieldGrid>
      </FieldSection>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
