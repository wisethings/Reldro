"use client";

import { useActionState } from "react";
import { updateOrgProfile } from "@/lib/actions/settings";
import { INDUSTRIES, COMPANY_SIZES, GEOGRAPHIES } from "@/lib/data/catalog";
import type { Organization } from "@prisma/client";

export function OrgProfileForm({ org }: { org: Organization }) {
  const [state, formAction, pending] = useActionState(updateOrgProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Saved.</p>}
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div>
        <label className="block text-xs font-medium text-ink-600">Company name</label>
        <input name="name" defaultValue={org.name} className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-600">Industry</label>
          <select name="industry" defaultValue={org.industry} className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm">
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Size</label>
          <select name="size" defaultValue={org.size} className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm">
            {COMPANY_SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Geography</label>
          <select name="geography" defaultValue={org.geography} className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm">
            {GEOGRAPHIES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
