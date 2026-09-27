"use client";

import { useActionState } from "react";
import { createDepartment } from "@/lib/actions/settings";

export function AddDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartment, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <input
        name="name"
        placeholder="Department name"
        required
        className="rounded-lg border border-ink-300 px-3 py-2 text-sm"
      />
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Adding…" : "Add department"}
      </button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
