"use client";

import { useActionState } from "react";
import { applyAsSpecialist } from "@/lib/actions/specialistApplication";
import { INDUSTRIES, DEPARTMENT_OPTIONS } from "@/lib/data/catalog";

export function SpecialistApplicationForm() {
  const [state, formAction, pending] = useActionState(applyAsSpecialist, undefined);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card">
        <h2 className="text-lg font-semibold text-ink-900">Application received</h2>
        <p className="mt-2 text-sm text-ink-600">
          {state.tempPassword
            ? "Here's a temporary password so you can log in and review your profile while our team takes a look:"
            : "We've emailed you login details so you can review your profile while our team takes a look."}{" "}
          You&apos;ll start showing up as a match once approved.
        </p>
        {state.tempPassword && (
          <p className="mt-4 rounded-lg bg-ink-50 px-4 py-2 font-mono text-sm text-ink-900">{state.tempPassword}</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
      {state?.error && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="block text-xs font-medium text-ink-600">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Headline</label>
        <input
          name="headline"
          required
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="AI implementation consultant for finance teams"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Bio</label>
        <textarea
          name="bio"
          required
          rows={4}
          className="mt-1 w-full rounded-lg border border-ink-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="A few sentences on your background and the kind of AI adoption work you do."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-ink-600">Years of experience</label>
          <input
            name="yearsExperience"
            type="number"
            min={0}
            required
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Hourly rate ($, optional)</label>
          <input
            name="hourlyRate"
            type="number"
            min={0}
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Location (optional)</label>
          <input
            name="location"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Austin, TX"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Industries you specialize in</label>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <label key={industry} className="flex items-center gap-1.5 text-xs text-ink-700">
              <input type="checkbox" name="industries" value={industry} className="rounded border-ink-300" />
              {industry}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Functions you specialize in</label>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {DEPARTMENT_OPTIONS.map((fn) => (
            <label key={fn} className="flex items-center gap-1.5 text-xs text-ink-700">
              <input type="checkbox" name="functions" value={fn} className="rounded border-ink-300" />
              {fn}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-600">Tools you're strongest with (comma separated, optional)</label>
        <input
          name="tools"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="ChatGPT, Copilot, Power BI"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
