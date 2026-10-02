"use client";

import { useActionState } from "react";
import { provisionOrganization } from "@/lib/actions/platform-admin";
import { Field, FieldGrid, Input } from "@/components/ui/Field";
import { InviteResult } from "@/components/team/InviteResult";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { btnGhost, btnPrimary, FormPanel, FormSection } from "@/components/ui/FormParts";

export function ProvisionOrgForm({ onDone }: { onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(provisionOrganization, undefined);

  if (state?.emailSent || state?.tempPassword) {
    return (
      <FormPanel
        title="Workspace created"
        description="The first admin signs in with the temporary password and finishes setup."
        actions={onDone && <button type="button" onClick={onDone} className={btnPrimary}>Done</button>}
      >
        <FormSection>
          <InviteResult result={state} />
        </FormSection>
      </FormPanel>
    );
  }

  return (
    <form action={formAction}>
      <FormPanel
        title="Create organization"
        description="Sets up the workspace and emails its first admin a temporary password."
        onClose={onDone}
        actions={
          <>
            <button type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Creating…</> : "Create workspace"}</button>
            {onDone && <button type="button" onClick={onDone} className={btnGhost}>Cancel</button>}
          </>
        }
      >
        {state?.error && <div className="px-4 pt-4 sm:px-5"><Alert tone="error">{state.error}</Alert></div>}
        <FormSection title="Company">
          <FieldGrid columns={2}>
            <Field label="Company name" required>
              <Input name="companyName" required autoComplete="off" />
            </Field>
            <Field label="Industry" optional>
              <Input name="industry" placeholder="Commercial electrical contracting" />
            </Field>
            <Field label="Headcount" optional>
              <Input name="size" placeholder="e.g. 85" inputMode="numeric" />
            </Field>
            <Field label="Geography" optional>
              <Input name="geography" placeholder="Chicago metro" />
            </Field>
          </FieldGrid>
        </FormSection>
        <FormSection title="First admin" hint="They get the invite email and run the first-time setup.">
          <FieldGrid columns={2}>
            <Field label="Admin name" required>
              <Input name="adminName" required autoComplete="off" />
            </Field>
            <Field label="Admin email" required>
              <Input name="adminEmail" type="email" required autoComplete="off" />
            </Field>
          </FieldGrid>
        </FormSection>
      </FormPanel>
    </form>
  );
}
