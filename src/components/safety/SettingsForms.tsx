"use client";

import { useActionState, useEffect, useState } from "react";
import { useConfirm } from "@/components/ui/useConfirm";
import { useRouter } from "next/navigation";
import { createEscalationRule, deleteEscalationRule, saveEmergencyInstructions, saveSite, setSiteActive } from "@/lib/actions/safetySettings";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAct } from "./useAct";
import { Spinner } from "@/components/ui/Spinner";
import { AdaptiveSelect, PersonSelect, type PersonOpt } from "@/components/ui/PersonSelect";

type Opt = { id: string; name: string };
type KeyOpt = { key: string; label: string };

export function EscalationRuleForm({ severities, categories, sites, people }: { severities: KeyOpt[]; categories: KeyOpt[]; sites: Opt[]; people: Opt[] }) {
  const [state, formAction, pending] = useActionState(createEscalationRule, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="When seriousness is at least"><Select name="minSeverity" defaultValue="HIGH">{severities.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
      <Field label="Topic" optional><Select name="category" defaultValue=""><option value="">Any topic</option>{categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
      <Field label="Site" optional><AdaptiveSelect name="siteId" noun="site" emptyLabel="Any site" options={sites.map((s) => ({ value: s.id, label: s.name }))} /></Field>
      <Field label="Assign to" optional hint="Blank uses the site's safety lead."><PersonSelect name="ownerId" people={people} emptyLabel="Site safety lead" /></Field>
      <Field label="Acknowledge within (hours)"><Input name="respondWithinHours" type="number" min={1} max={720} defaultValue={24} required /></Field>
      <Field label="Escalate to if late" optional><PersonSelect name="escalateToId" people={people} emptyLabel="Nobody" /></Field>
      <label className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 text-sm sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="openIncident" className="mt-1" />
        <span>
          <span className="font-medium text-ink-900">Also open an incident response</span>
          <span className="block text-xs text-ink-600">
            When a new report matches, the shared incident workspace opens with the person in “Assign to” as lead, and the escalation contact is added to the response team. Both are emailed a link if email is set up.
            Seriousness at this point is only a suggestion from the words in the report, so responders can stand it down if it isn't one. Leave this off for minor reports.
          </span>
        </span>
      </label>
      <div className="sm:col-span-2 lg:col-span-3">
        <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? <><Spinner /> Adding…</> : "Add rule"}</button>
        {state?.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="mt-2 text-sm text-sage-deep">{state.success}</p>}
      </div>
    </form>
  );
}

export function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const { run, pending } = useAct();
  const { ask, dialog } = useConfirm();
  return (
    <>
      <button disabled={pending} onClick={() => ask({ title: "Delete this rule?", body: "New reports will no longer be routed by it. Reports already routed keep their owner.", confirmLabel: "Delete rule", destructive: true, onConfirm: () => run(() => deleteEscalationRule(ruleId)) })} className="text-xs text-danger hover:underline">Delete</button>
      {dialog}
    </>
  );
}

export function SiteEditor({ site, people, trigger, siteExample = "Bayside Tower \u2014 Electrical Package", kinds = [{ key: "JOBSITE", label: "Jobsite" }, { key: "SHOP", label: "Shop or fabrication shop" }, { key: "YARD", label: "Yard or laydown area" }] }: { site?: { id: string; name: string; address: string; kind: string; safetyLeadId: string | null }; people: Opt[]; trigger: string; siteExample?: string; kinds?: KeyOpt[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(site?.kind ?? kinds[0]?.key ?? "JOBSITE");
  const [state, formAction, pending] = useActionState(saveSite, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) { setOpen(false); router.refresh(); } }, [state, router]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={site ? "rounded-md px-2 py-1 text-xs font-semibold text-orchid-deep hover:bg-orchid-soft/60 hover:text-oxblood" : "rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"}>{trigger}</button>
      {open && (
        <Modal title={site ? "Edit site" : "Add a site"} onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-3">
            {site && <input type="hidden" name="siteId" value={site.id} />}
            {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            <Field label="Name" required><Input name="name" defaultValue={site?.name} required placeholder={`e.g. ${kind === "WAREHOUSE" ? "North Yard \u2014 Warehouse 2" : siteExample}`} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type"><Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</Select></Field>
              <Field label="Safety lead for this site" hint="Reports for this site go to this person unless an escalation rule says otherwise."><PersonSelect name="safetyLeadId" defaultValue={site?.safetyLeadId ?? ""} people={people} emptyLabel="None yet" /></Field>
            </div>
            <Field label="Address" optional><Input name="address" defaultValue={site?.address} /></Field>
            <button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? <><Spinner /> Saving…</> : "Save site"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SiteActiveToggle({ siteId, active }: { siteId: string; active: boolean }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => run(() => setSiteActive(siteId, !active))} className="rounded-md px-2 py-1 text-xs font-normal text-ink-500 hover:bg-surface-hover hover:text-ink-800">{active ? "Archive" : "Restore"}</button>;
}

export function EmergencyInstructionsForm({ initial }: { initial: string }) {
  const [state, formAction, pending] = useActionState(saveEmergencyInstructions, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Emergency instructions shown to reporters" hint="Shown on the report form after the standard message: “If anyone is in immediate danger or needs urgent medical help, call your local emergency number or follow your site's emergency procedure now.” Leave blank to show the standard message only. Reldro does not contact emergency services.">
        <Textarea name="emergencyInstructions" rows={3} maxLength={600} defaultValue={initial} placeholder="e.g. Call 911, then the site superintendent at 555-0142. Muster at the north gate." />
      </Field>
      <button disabled={pending} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover disabled:opacity-50">{pending ? <><Spinner /> Saving…</> : "Save"}</button>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
    </form>
  );
}
