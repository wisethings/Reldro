"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/account";
import { Field, Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Current password" required>
          <Input name="currentPassword" type="password" required />
        </Field>
        <Field label="New password" hint="At least 8 characters" required>
          <Input name="newPassword" type="password" required minLength={8} />
        </Field>
      </div>
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? <><Spinner /> Updating…</> : "Update password"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Password updated.</p>}
    </form>
  );
}
