"use client";

import { useActionState } from "react";
import { inviteCompanyAdmin } from "@/lib/actions/settings";

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(inviteCompanyAdmin, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input name="name" placeholder="Full name" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm" />
      <input name="email" type="email" placeholder="Work email" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm" />
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Inviting…" : "Invite admin"}
      </button>
      {state?.error && <p className="sm:col-span-3 text-sm text-danger">{state.error}</p>}
      {state?.emailSent && (
        <p className="sm:col-span-3 rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">
          Invited. An email with their login details was sent.
        </p>
      )}
      {state?.tempPassword && (
        <p className="sm:col-span-3 rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">
          Invited. Email isn't configured in this environment, so share this temporary password with them directly:{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
    </form>
  );
}
