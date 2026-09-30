"use client";

import { useActionState } from "react";
import { createDepartment } from "@/lib/actions/settings";
import { Input } from "@/components/ui/Field";

export function AddDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartment, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <Input name="name" placeholder="Crew name (e.g. Prewire crew)" required className="w-auto min-w-[12rem] flex-1" />
      <button disabled={pending} className="shrink-0 rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Adding…" : "Add crew"}
      </button>
      {state?.error && <p className="w-full text-sm text-danger">{state.error}</p>}
    </form>
  );
}
