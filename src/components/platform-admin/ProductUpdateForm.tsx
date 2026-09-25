"use client";

import { useActionState } from "react";
import { sendProductUpdate } from "@/lib/actions/productUpdates";

const AUDIENCES = [
  { value: "employees", label: "All employees at customer orgs", desc: "Every user with an organization, both admins and employees." },
  { value: "admins", label: "Org admins only", desc: "Just COMPANY_ADMIN accounts, one per customer org typically." },
  { value: "leads", label: "Demo requests / leads", desc: "Everyone who submitted the demo request form, converted or not." },
] as const;

export function ProductUpdateForm() {
  const [state, formAction, pending] = useActionState(sendProductUpdate, undefined);

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-lg border border-ink-200 bg-white p-5">
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {typeof state?.sent === "number" && (
        <p className="rounded-lg border border-sage bg-sage/20 px-3 py-2 text-sm text-sage-deep">
          Sent to {state.sent} of {state.total} recipient{state.total === 1 ? "" : "s"}.
          {state.failed ? ` ${state.failed} failed, see server logs for the reason.` : ""}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-ink-600">Subject</label>
        <input
          name="subject"
          required
          placeholder="New in Reldro: workflow chaining"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Message</label>
        <textarea
          name="message"
          required
          rows={8}
          placeholder="Plain text. Blank lines start a new paragraph."
          className="mt-1 w-full rounded-lg border border-ink-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Send to</label>
        <div className="mt-2 space-y-2">
          {AUDIENCES.map((a) => (
            <label key={a.value} className="flex items-start gap-2.5 text-sm text-ink-700">
              <input type="checkbox" name="audience" value={a.value} className="mt-0.5" />
              <span>
                <span className="font-medium text-ink-900">{a.label}</span>
                <span className="block text-xs text-ink-500">{a.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send update"}
      </button>
    </form>
  );
}
