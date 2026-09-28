"use client";

import { useActionState } from "react";
import { provisionOrganization } from "@/lib/actions/platform-admin";
import { Field, FieldGrid, FieldSection, Input, Select } from "@/components/ui/Field";

const SIZES = ["1-50", "51-200", "201-1000", "1000+"];

export function ProvisionOrgForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(provisionOrganization, undefined);

  if (state?.emailSent || state?.tempPassword) {
    return (
      <div className="rounded-lg border border-sage bg-sage/20 p-4 text-sm text-sage-deep">
        <p className="font-medium">Workspace created.</p>
        {state.emailSent ? (
          <p className="mt-1">An invite email with a temporary password was sent to the new admin.</p>
        ) : (
          <p className="mt-1">
            Email isn't configured in this environment - share this temporary password directly: <span className="font-mono font-semibold">{state.tempPassword}</span>
          </p>
        )}
        {onDone && (
          <button onClick={onDone} className="mt-3 text-xs font-medium text-orchid-deep hover:text-oxblood">
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
            <Input name="industry" placeholder="Insurance" />
          </Field>
          <Field label="Company size" optional>
            <Select name="size" defaultValue="">
              <option value="">Not set</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} employees
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Geography" optional>
            <Input name="geography" placeholder="North America" />
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
