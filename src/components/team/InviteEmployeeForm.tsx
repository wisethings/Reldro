"use client";

import { useActionState } from "react";
import { inviteEmployee } from "@/lib/actions/team";
import { Input, Select } from "@/components/ui/Field";

export function InviteEmployeeForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(inviteEmployee, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-5">
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <Input name="jobTitle" placeholder="Job title" required />
      <Select name="departmentId">
        <option value="">No department</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Inviting…" : "Invite employee"}
      </button>
      {state?.error && <p className="text-sm text-danger sm:col-span-5">{state.error}</p>}
      {state?.emailSent && (
        <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep sm:col-span-5">
          Invited. An email with their login details was sent.
        </p>
      )}
      {state?.tempPassword && (
        <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep sm:col-span-5">
          Invited. Email isn't configured in this environment, so share this temporary password with them directly:{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
    </form>
  );
}
