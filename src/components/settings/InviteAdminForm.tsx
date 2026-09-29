"use client";

import { useActionState } from "react";
import { inviteCompanyAdmin } from "@/lib/actions/settings";
import { InviteResult } from "@/components/team/InviteResult";
import { Input } from "@/components/ui/Field";

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(inviteCompanyAdmin, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Inviting…" : "Invite admin"}
      </button>
      <InviteResult result={state} className="sm:col-span-3" />
    </form>
  );
}
