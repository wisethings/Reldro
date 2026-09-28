"use client";

import { useActionState } from "react";
import { updateSpecialistProfile } from "@/lib/actions/specialist";
import type { Specialist } from "@prisma/client";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";

export function SpecialistProfileForm({ specialist }: { specialist: Specialist }) {
  const [state, formAction, pending] = useActionState(updateSpecialistProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Profile updated.</p>}
      <Field label="Headline">
        <Input name="headline" defaultValue={specialist.headline} />
      </Field>
      <Field label="Bio">
        <Textarea name="bio" defaultValue={specialist.bio} rows={4} />
      </Field>
      <FieldGrid columns={3}>
        <Field label="Hourly rate ($)">
          <Input name="hourlyRate" type="number" defaultValue={specialist.hourlyRate ?? ""} />
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={specialist.location ?? ""} />
        </Field>
        <Field label="Availability">
          <Select name="availability" defaultValue={specialist.availability}>
            <option>Available now</option>
            <option>2 weeks out</option>
            <option>Booked</option>
          </Select>
        </Field>
      </FieldGrid>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
