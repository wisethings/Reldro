"use client";

import { useActionState } from "react";
import { verifyTwoFactor } from "@/lib/actions/twoFactor";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { authButton, authInput, authLabel } from "./styles";

export function TwoFactorForm({ setup }: { setup: boolean }) {
  const [state, formAction, pending] = useActionState(verifyTwoFactor, undefined);
  return (
    <form action={formAction} className="space-y-5">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="space-y-2">
        <label htmlFor="code" className={authLabel}>6-digit code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus placeholder="123456" aria-invalid={state?.error ? true : undefined} className={`${authInput} tracking-[0.25em]`} />
      </div>
      <button type="submit" disabled={pending} className={authButton}>
        {pending ? <><Spinner /> Checking…</> : setup ? "Turn on and continue" : "Continue"}
      </button>
    </form>
  );
}
