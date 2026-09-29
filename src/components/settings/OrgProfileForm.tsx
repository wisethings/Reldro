"use client";

import { useActionState } from "react";
import { updateOrgProfile } from "@/lib/actions/settings";
import { INDUSTRIES, COMPANY_SIZES, GEOGRAPHIES } from "@/lib/data/catalog";
import type { Organization } from "@prisma/client";
import { Field, FieldSection, Input, Select } from "@/components/ui/Field";
import { RecalculateValueEstimatesButton } from "./RecalculateValueEstimatesButton";

export function OrgProfileForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState(updateOrgProfile, undefined);

  return (
    <form action={formAction} className="space-y-5">
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

      <FieldSection title="Value estimates">
        <Field
          label="Blended hourly rate ($)"
          hint="Fully-loaded cost of an hour of employee time at your company - used to turn time saved into a dollar value instead of a company-wide guess."
          className="max-w-xs"
        >
          <Input name="blendedHourlyRate" type="number" min={1} step="0.01" defaultValue={org.blendedHourlyRate} />
        </Field>
      </FieldSection>

      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>

      <div className="border-t border-ink-100 pt-4">
        <p className="text-xs text-ink-500">
          Saving a new rate above only applies to opportunities created from now on. To update value estimates already on the
          Opportunities, ROI, and Analytics pages, recalculate them with your current rate:
        </p>
        <div className="mt-2">
          <RecalculateValueEstimatesButton />
        </div>
      </div>
    </form>
  );
}
