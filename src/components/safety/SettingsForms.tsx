"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEscalationRule, deleteEscalationRule, requestSetupSupport, saveSite, setSiteActive } from "@/lib/actions/safetySettings";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAct } from "./useAct";

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
      <Field label="Site" optional><Select name="siteId" defaultValue=""><option value="">Any site</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Assign to" optional hint="Blank uses the site's safety lead."><Select name="ownerId" defaultValue=""><option value="">Site safety lead</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Acknowledge within (hours)"><Input name="respondWithinHours" type="number" min={1} max={720} defaultValue={24} required /></Field>
      <Field label="Escalate to if late" optional><Select name="escalateToId" defaultValue=""><option value="">Nobody</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <div className="sm:col-span-2 lg:col-span-3">
        <button disabled={pending} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Adding…" : "Add rule"}</button>
        {state?.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="mt-2 text-sm text-sage-deep">{state.success}</p>}
      </div>
    </form>
  );
}

export function DeleteRuleButton({ ruleId }: { ruleId: string }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => confirm("Delete this rule?") && run(() => deleteEscalationRule(ruleId))} className="text-xs text-danger hover:underline">Delete</button>;
}

export function SetupSupportForm() {
  const [state, formAction, pending] = useActionState(requestSetupSupport, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <Field label="What would you like help with?"><Textarea name="need" rows={3} placeholder="e.g. Setting up our sites and escalation rules, or reviewing our incident categories" required /></Field>
      <button disabled={pending} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50">{pending ? "Sending…" : "Request setup help"}</button>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
    </form>
  );
}

export function SiteEditor({ site, people, trigger }: { site?: { id: string; name: string; address: string; kind: string; safetyLeadId: string | null }; people: Opt[]; trigger: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveSite, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) { setOpen(false); router.refresh(); } }, [state, router]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={site ? "text-xs font-medium text-orchid-deep hover:text-oxblood" : "rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"}>{trigger}</button>
      {open && (
        <Modal title={site ? "Edit site" : "Add a site"} onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-3">
            {site && <input type="hidden" name="siteId" value={site.id} />}
            {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
            <Field label="Name" required><Input name="name" defaultValue={site?.name} required placeholder="e.g. Riverside Medical Center (Level 3)" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Type"><Select name="kind" defaultValue={site?.kind ?? "JOBSITE"}><option value="JOBSITE">Jobsite</option><option value="SHOP">Shop / fab shop</option><option value="YARD">Yard / warehouse</option></Select></Field>
              <Field label="Safety lead for this site" hint="Reports here route to this person unless a rule says otherwise."><Select name="safetyLeadId" defaultValue={site?.safetyLeadId ?? ""}><option value="">None yet</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            </div>
            <Field label="Address" optional><Input name="address" defaultValue={site?.address} /></Field>
            <button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Save site"}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SiteActiveToggle({ siteId, active }: { siteId: string; active: boolean }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => run(() => setSiteActive(siteId, !active))} className="text-xs font-medium text-ink-600 hover:text-ink-900">{active ? "Archive" : "Restore"}</button>;
}
