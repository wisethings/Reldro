"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { authButton, authInput, authLabel } from "./styles";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const invalid = state?.error ? true : undefined;

  return (
    <form action={formAction} className="space-y-6" noValidate={false}>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="space-y-2">
        <label htmlFor="email" className={authLabel}>Work email</label>
        <input id="email" name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@company.com" aria-invalid={invalid} className={authInput} />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className={authLabel}>Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" aria-invalid={invalid} className={authInput} />
      </div>
      <button type="submit" disabled={pending} className={`${authButton} !mt-7`}>
        {pending ? <><Spinner /> Signing in…</> : "Sign in"}
      </button>
    </form>
  );
}
