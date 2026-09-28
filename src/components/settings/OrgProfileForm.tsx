"use client";

import { useActionState } from "react";
import { updateOrgProfile } from "@/lib/actions/settings";
import { INDUSTRIES, COMPANY_SIZES, GEOGRAPHIES } from "@/lib/data/catalog";
import type { Organization } from "@prisma/client";
import { Field, Input, Select } from "@/components/ui/Field";

export function OrgProfileForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState(updateOrgProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Saved.</p>}
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <Field label="Company name">
          <Input name="name" defaultValue={org.name} />
        </Field>
        <Field label="Industry">
          <Select name="industry" defaultValue={org.industry}>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
        <Field label="Size">
          <Select name="size" defaultValue={org.size}>
            {COMPANY_SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="Geography">
          <Select name="geography" defaultValue={org.geography}>
            {GEOGRAPHIES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </Field>
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
