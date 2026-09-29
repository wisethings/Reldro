"use client";

import { useActionState } from "react";
import { inviteEmployee } from "@/lib/actions/team";
import { InviteResult } from "@/components/team/InviteResult";
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
      <InviteResult result={state} className="sm:col-span-5" />
    </form>
  );
}
