"use client";

import { useActionState } from "react";
import { inviteEmployee } from "@/lib/actions/team";

export function InviteEmployeeForm({ departments }: { departments: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(inviteEmployee, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-5">
      <input name="name" placeholder="Full name" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm sm:col-span-1" />
      <input name="email" type="email" placeholder="Work email" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm sm:col-span-1" />
      <input name="jobTitle" placeholder="Job title" required className="rounded-lg border border-ink-300 px-3 py-2 text-sm sm:col-span-1" />
      <select name="departmentId" className="rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm sm:col-span-1">
        <option value="">No department</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60 sm:col-span-1">
        {pending ? "Inviting…" : "Invite employee"}
      </button>
      {state?.error && <p className="sm:col-span-5 text-sm text-danger">{state.error}</p>}
      {state?.emailSent && (
        <p className="sm:col-span-5 rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">
          Invited. An email with their login details was sent.
        </p>
      )}
      {state?.tempPassword && (
        <p className="sm:col-span-5 rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">
          Invited. Email isn't configured in this environment, so share this temporary password with them directly:{" "}
          <span className="font-mono font-semibold">{state.tempPassword}</span>
        </p>
      )}
    </form>
  );
}
