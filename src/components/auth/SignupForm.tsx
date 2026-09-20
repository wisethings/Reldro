"use client";

import { useActionState } from "react";
import { signupOrganization } from "@/lib/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupOrganization, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label className="block text-xs font-medium text-ink-600">Company name</label>
        <input
          name="companyName"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Acme Corp"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Your name</label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Jordan Lee"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Work email</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="At least 8 characters"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Creating your workspace…" : "Create organization"}
      </button>
    </form>
  );
}
