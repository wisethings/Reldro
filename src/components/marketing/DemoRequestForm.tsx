"use client";

import { useActionState } from "react";
import { submitDemoRequest } from "@/lib/actions/demoRequest";

const COMPANY_SIZES = ["1-50", "51-200", "201-1000", "1000+"];

export function DemoRequestForm() {
  const [state, formAction, pending] = useActionState(submitDemoRequest, undefined);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card">
        <h2 className="text-lg font-semibold text-ink-900">Thanks — we'll be in touch</h2>
        <p className="mt-2 text-sm text-ink-600">
          A member of our team will reach out by email shortly to schedule a walkthrough and get your workspace set up.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
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
        <label className="block text-xs font-medium text-ink-600">Company name</label>
        <input
          name="companyName"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Acme Corp"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Company size</label>
        <select
          name="companySize"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="" disabled>
            Select a range
          </option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} employees
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">What are you hoping to solve? (optional)</label>
        <textarea
          name="message"
          rows={3}
          className="mt-1 w-full rounded-lg border border-ink-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Tell us a bit about your team and where AI adoption is stalling."
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Request a demo"}
      </button>
    </form>
  );
}
