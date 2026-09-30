"use client";

import { useActionState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Field, FieldGrid, Input } from "@/components/ui/Field";

export function ProfileForm({
  name,
  email,
  jobTitle,
  department,
}: {
  name: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-3">
      <FieldGrid columns={2}>
        <Field label="Full name" required>
          <Input name="name" defaultValue={name} required maxLength={100} />
        </Field>
        {jobTitle !== null && (
          <Field label="Job title" required>
            <Input name="jobTitle" defaultValue={jobTitle} required maxLength={100} />
          </Field>
        )}
      </FieldGrid>
      <FieldGrid columns={2}>
        <Field label="Email" hint="Your login. Ask an admin to change it.">
          <Input value={email} disabled readOnly />
        </Field>
        {jobTitle !== null && (
          <Field label="Crew" hint="Set by an admin.">
            <Input value={department ?? "No department"} disabled readOnly />
          </Field>
        )}
      </FieldGrid>
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Profile updated.</p>}
    </form>
  );
}
