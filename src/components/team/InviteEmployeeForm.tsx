"use client";

import { useActionState } from "react";
import { inviteEmployee } from "@/lib/actions/team";
import { InviteResult } from "@/components/team/InviteResult";
import { Input, Select } from "@/components/ui/Field";

export function InviteEmployeeForm({ crews, sites }: { crews: { id: string; name: string }[]; sites: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(inviteEmployee, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <Input name="jobTitle" placeholder="Job title (e.g. Journeyman electrician)" required />
      <Select name="departmentId" aria-label="Crew">
        <option value="">No crew</option>
        {crews.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <Select name="siteId" aria-label="Home site">
        <option value="">No home site</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Inviting…" : "Invite person"}
      </button>
      <InviteResult result={state} className="sm:col-span-2 lg:col-span-3" />
    </form>
  );
}
