"use client";

import { useActionState } from "react";
import { completeSafetyOnboarding } from "@/lib/actions/safetySettings";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

export function SafetyOnboarding({ companyName }: { companyName: string }) {
  const [state, formAction, pending] = useActionState(completeSafetyOnboarding, undefined);
  return (
    <form action={formAction} className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome, {companyName}</h1>
        <p className="mt-1 text-sm text-ink-600">Two minutes to get your first site ready so reports have somewhere to go. You can change everything later.</p>
      </div>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Your first site</h2>
        <Field label="Jobsite, shop or yard name" required><Input name="siteName" required placeholder="e.g. Bayside Tower — Electrical Package" /></Field>
        <Field label="Address" optional><Input name="address" /></Field>
      </div>
      <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Your emergency instructions</h2>
        <Field label="What should someone do first in an emergency?" optional hint="Every reporter sees this on the report form, after the standard message about calling the local emergency number. Reldro does not contact emergency services, so this should reflect your own plan. Leave it blank to show the standard message only.">
          <Textarea name="emergencyInstructions" rows={3} maxLength={600} placeholder="e.g. Call 911, then the site superintendent at 555-0142. Muster at the north gate." />
        </Field>
      </div>
      <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Add the standard starting checklists</h2>
        <label className="flex items-start gap-2 text-sm text-ink-800"><input type="checkbox" name="starterTemplates" defaultChecked className="mt-1" /> A weekly jobsite safety walk, a job-start readiness check and a 5-minute observation. Edit or delete any of them.</label>
      </div>
      <div className="space-y-2 rounded-2xl border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Who should new reports go to?</h2>
        <p className="text-xs text-ink-500">Until you name a safety lead for a site (under People and Sites), new reports show up on your Overview as unassigned so nothing waits unseen. You can add escalation rules in Settings.</p>
        <Textarea name="note" rows={2} placeholder="Optional: anything we should know about how your safety team works?" />
      </div>
      <button disabled={pending} className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Setting up…" : "Finish setup"}</button>
    </form>
  );
}
