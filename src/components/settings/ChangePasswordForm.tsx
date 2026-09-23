"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/account";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <form action={formAction} className="space-y-3 max-w-sm">
      <div>
        <label className="block text-xs font-medium text-ink-600">Current password</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">New password</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-[11px] text-ink-400">At least 8 characters.</p>
      </div>
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Password updated.</p>}
    </form>
  );
}
