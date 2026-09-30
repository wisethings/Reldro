"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <Field label="Work email">
        <Input name="email" type="email" required placeholder="you@company.com" />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" required placeholder="••••••••" />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
