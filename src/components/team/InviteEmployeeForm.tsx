"use client";

import { useActionState } from "react";
import { inviteEmployee } from "@/lib/actions/team";
import { InviteResult } from "@/components/team/InviteResult";
import { Input, Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { AdaptiveSelect } from "@/components/ui/PersonSelect";

export function InviteEmployeeForm({ crews, sites }: { crews: { id: string; name: string }[]; sites: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(inviteEmployee, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <Input name="jobTitle" placeholder="Job title (e.g. Journeyman electrician)" required />
      <AdaptiveSelect name="departmentId" aria-label="Crew" noun="crew" emptyLabel="No crew" options={crews.map((d) => ({ value: d.id, label: d.name }))} />
      <AdaptiveSelect name="siteId" aria-label="Home site" noun="site" emptyLabel="No home site" options={sites.map((s) => ({ value: s.id, label: s.name }))} />
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? <><Spinner /> Inviting…</> : "Invite person"}
      </button>
      <InviteResult result={state} className="sm:col-span-2 lg:col-span-3" />
    </form>
  );
}
