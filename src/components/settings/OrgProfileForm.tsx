"use client";

import { useActionState } from "react";
import { updateOrgProfile } from "@/lib/actions/settings";
import type { Organization } from "@prisma/client";
import { Field, Input } from "@/components/ui/Field";

export function OrgProfileForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState(updateOrgProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Saved.</p>}
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company name">
          <Input name="name" defaultValue={org.name} required />
        </Field>
        <Field label="Trade or industry">
          <Input name="industry" defaultValue={org.industry} placeholder="e.g. Commercial electrical contracting" />
        </Field>
        <Field label="Approximate headcount">
          <Input name="size" defaultValue={org.size} placeholder="e.g. 85" />
        </Field>
        <Field label="Where you operate">
          <Input name="geography" defaultValue={org.geography} placeholder="e.g. Chicago metro, Northern Indiana" />
        </Field>
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
