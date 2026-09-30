"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completeInspection, createTemplate, scheduleInspection, addStarterTemplates, deleteTemplate, raiseReportFromInspection } from "@/lib/actions/safetyInspections";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAct } from "./useAct";
import { Alert } from "@/components/ui/Alert";

export function ScheduleInspectionForm({ templates, sites, people }: { templates: { id: string; name: string }[]; sites: { id: string; name: string }[]; people: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(scheduleInspection, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="Checklist"><Select name="templateId" required defaultValue=""><option value="" disabled>Choose…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
      <Field label="Site"><Select name="siteId" required defaultValue=""><option value="" disabled>Choose…</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Owner"><Select name="assigneeId" defaultValue=""><option value="">Anyone at the site</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Due date"><Input name="dueDate" type="date" required /></Field>
      <div className="flex items-end"><button disabled={pending} className="w-full rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Scheduling…" : "Schedule"}</button></div>
      {state?.error && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-5">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep sm:col-span-2 lg:col-span-5">{state.success}</p>}
    </form>
  );
}

export function TemplateForm() {
  const [state, formAction, pending] = useActionState(createTemplate, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Checklist name"><Input name="name" required placeholder="e.g. Electrical room readiness" /></Field>
        <Field label="Type"><Select name="kind" defaultValue="SITE_INSPECTION"><option value="SITE_INSPECTION">Site inspection</option><option value="READINESS">Readiness check</option><option value="OBSERVATION">Observation</option></Select></Field>
        <Field label="Repeat every (days)" optional><Input name="frequencyDays" type="number" min={1} /></Field>
      </div>
      <Field label="Items" hint="One per line. Start a line with * to mark it critical."><Textarea name="items" rows={5} required placeholder={"* Lockout/tagout applied\nWalkways clear"} /></Field>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep">{state.success}</p>}
      <button disabled={pending} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50">{pending ? "Saving…" : "Save checklist"}</button>
    </form>
  );
}

export function StarterTemplatesButton() {
  const { run, pending, error } = useAct();
  return (
    <div>
      <button disabled={pending} onClick={() => run(() => addStarterTemplates())} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Adding…" : "Add starter checklists"}</button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => confirm("Delete this checklist? Scheduled inspections that use it will also be removed.") && run(() => deleteTemplate(templateId))} className="text-xs text-danger hover:underline">Delete</button>;
}

type Item = { id: string; label: string; critical?: boolean };

export function InspectionRunner({ inspectionId, items }: { inspectionId: string; items: Item[] }) {
  const [state, formAction, pending] = useActionState(completeInspection, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="space-y-4 pb-24 sm:pb-0">
      <input type="hidden" name="inspectionId" value={inspectionId} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="rounded-xl border border-ink-200 bg-white p-3">
            <p className="text-sm font-medium text-ink-900">{it.label}{it.critical && <span className="ml-2 rounded bg-coral-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">Critical</span>}</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={it.label}>
              {[["PASS", "Pass"], ["FAIL", "Fail"], ["NA", "N/A"]].map(([val, label]) => (
                <label key={val} className="relative cursor-pointer">
                  <input type="radio" name={`result_${it.id}`} value={val} className="peer sr-only" required />
                  <span className={`block rounded-lg border border-ink-200 py-2.5 text-center text-sm font-medium text-ink-700 ${val === "FAIL" ? "peer-checked:border-danger peer-checked:bg-coral-soft peer-checked:text-danger" : val === "PASS" ? "peer-checked:border-sage-deep peer-checked:bg-sage peer-checked:text-sage-deep" : "peer-checked:border-ink-400 peer-checked:bg-surface-sunken"}`}>{label}</span>
                </label>
              ))}
            </div>
            <Input name={`note_${it.id}`} placeholder="Note (optional)" className="mt-2" />
          </li>
        ))}
      </ul>
      <Field label="Overall notes" optional><Textarea name="notes" rows={2} /></Field>
      <label className="flex items-start gap-2 text-sm text-ink-800"><input type="checkbox" name="createActions" defaultChecked className="mt-1" /> Turn failed items into proposed corrective actions</label>
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ink-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
        <button disabled={pending} className="w-full rounded-full bg-brand-700 px-6 py-3 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-50 sm:w-auto">{pending ? "Submitting…" : "Submit inspection"}</button>
      </div>
    </form>
  );
}

/** Files one failed inspection item as a hazard report so it is routed and tracked like any other hazard. */
export function RaiseReportButton({ inspectionId, itemId }: { inspectionId: string; itemId: string }) {
  const { run, pending, error } = useAct();
  return (
    <div className="mt-1">
      <button disabled={pending} onClick={() => run(() => raiseReportFromInspection(inspectionId, itemId))} className="text-xs font-medium text-orchid-deep hover:text-oxblood disabled:opacity-40">
        {pending ? "Filing…" : "File as a hazard report"}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
