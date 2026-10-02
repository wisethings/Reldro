"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { addQualification } from "@/lib/actions/safetyTraining";
import { deleteCertificationType, saveCertificationType, verifyQualification, type CertTypeInput } from "@/lib/actions/safetyCertifications";
import { suggestedExpiry } from "@/lib/safety/certifications";
import { Field, FieldGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { PersonSelect, type PersonOpt } from "@/components/ui/PersonSelect";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { btnGhost, btnPrimary, btnSecondary, FormPanel, FormSection } from "@/components/ui/FormParts";
import { cn } from "@/components/ui/cn";
import { useAct } from "./useAct";

export type CatalogOption = { id: string; name: string; issuingBody: string; validityMonths: number | null };

/** Record a certification: pick it from the catalog (which fills the issuer and suggests an expiry) or type a one-off name. */
export function CertificationRecordForm({ people, types, canVerify, defaultEmployeeId, defaultTypeId }: { people: PersonOpt[]; types: CatalogOption[]; canVerify: boolean; defaultEmployeeId?: string; defaultTypeId?: string }) {
  const [state, formAction, pending] = useActionState(addQualification, undefined);
  const router = useRouter();
  const [typeId, setTypeId] = useState(defaultTypeId && types.some((t) => t.id === defaultTypeId) ? defaultTypeId : "");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [touched, setTouched] = useState(false);
  const [issuer, setIssuer] = useState("");
  const type = types.find((t) => t.id === typeId);
  const suggestion = useMemo(() => {
    if (!type?.validityMonths || !issued) return null;
    const d = suggestedExpiry(new Date(`${issued}T00:00:00Z`), type.validityMonths);
    return d ? d.toISOString().slice(0, 10) : null;
  }, [type, issued]);

  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (!state?.success) return;
    // Start the next record from a clean form.
    setFormKey((k) => k + 1);
    setTypeId("");
    setIssued("");
    setExpires("");
    setTouched(false);
    router.refresh();
  }, [state, router]);
  // Follow the catalog entry until the person types their own expiry or issuer.
  useEffect(() => { if (!touched) setExpires(suggestion ?? ""); }, [suggestion, touched]);
  useEffect(() => { setIssuer(type?.issuingBody ?? ""); }, [type]);

  return (
    <form action={formAction} key={formKey}>
      <FormPanel
        title="Record a certification"
        description="Reldro flags it 30 days before it expires and counts it toward any requirement for that certification."
        actions={<button type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Saving…</> : "Save certification"}</button>}
      >
        {state?.error && <div className="px-4 pt-4 sm:px-5"><Alert tone="error">{state.error}</Alert></div>}
        {state?.success && <div className="px-4 pt-4 sm:px-5"><Alert tone="success">{state.success}</Alert></div>}
        <FormSection>
          <FieldGrid columns={2}>
            <Field label="Person" required><PersonSelect name="employeeId" required people={people} defaultValue={defaultEmployeeId} /></Field>
            <Field label="Certification" required>
              {types.length > 0 ? (
                <Select name="typeId" value={typeId} onChange={(e) => { setTypeId(e.target.value); setTouched(false); }}>
                  <option value="">Other (type a name)</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              ) : (
                <Input name="name" required placeholder="e.g. OSHA 30" />
              )}
            </Field>
            {types.length > 0 && !typeId && <Field label="Name" required className="sm:col-span-2"><Input name="name" required placeholder="e.g. Confined space entry" /></Field>}
          </FieldGrid>
          <FieldGrid columns={4}>
            <Field label="Issued" optional><Input name="issuedOn" type="date" value={issued} onChange={(e) => { setIssued(e.target.value); setTouched(false); }} /></Field>
            <Field label="Expires" optional hint={suggestion && !touched ? `Suggested from ${type?.validityMonths} months` : undefined}>
              <Input name="expiresOn" type="date" value={expires} onChange={(e) => { setExpires(e.target.value); setTouched(true); }} />
            </Field>
            <Field label="Certificate number" optional><Input name="certificateNumber" autoComplete="off" /></Field>
            <Field label="Issuing body" optional><Input name="issuingBody" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. OSHA, NCCER" /></Field>
          </FieldGrid>
          <Field label="Notes" optional><Textarea name="notes" rows={2} maxLength={500} placeholder="Course provider, card location, restrictions…" /></Field>
          {canVerify && (
            <label className="flex items-start gap-2 text-sm text-ink-800">
              <input type="checkbox" name="verified" className="mt-1" />
              <span>I have seen the certificate or card<span className="block text-xs text-ink-500">Marks the record verified with today’s date.</span></span>
            </label>
          )}
        </FormSection>
      </FormPanel>
    </form>
  );
}

/** Verify (or clear verification of) a certificate on the detail page. */
export function VerifyButton({ id, verified }: { id: string; verified: boolean }) {
  const { run, pending, error } = useAct();
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" disabled={pending} onClick={() => run(() => verifyQualification(id, !verified))} className={verified ? btnSecondary : btnPrimary}>
        {pending ? <Spinner /> : <BadgeCheck size={15} className="mr-1.5 inline -mt-0.5" aria-hidden />}
        {verified ? "Clear verification" : "Mark as verified"}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export type CatalogRow = {
  id: string;
  name: string;
  category: string;
  issuingBody: string;
  validityMonths: number | null;
  requiredScope: string;
  requiredSiteIds: string[];
  requiredCrewIds: string[];
  requirement: string;
  holders: string;
};
type Opt = { id: string; name: string };

function TypeEditor({ initial, sites, crews, categories, onClose }: { initial?: CatalogRow; sites: Opt[]; crews: Opt[]; categories: string[]; onClose: () => void }) {
  const { run, pending, error } = useAct();
  const [f, setF] = useState<CertTypeInput>({
    id: initial?.id,
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    issuingBody: initial?.issuingBody ?? "",
    validityMonths: initial?.validityMonths ? String(initial.validityMonths) : "",
    requiredScope: initial?.requiredScope ?? "NONE",
    requiredSiteIds: initial?.requiredSiteIds ?? [],
    requiredCrewIds: initial?.requiredCrewIds ?? [],
  });
  const set = <K extends keyof CertTypeInput>(k: K, v: CertTypeInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k: "requiredSiteIds" | "requiredCrewIds", id: string) => set(k, f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id]);
  const scopes = [
    { v: "NONE", t: "Not required", d: "Tracked for those who hold it." },
    { v: "ALL", t: "Everyone", d: "Every person in the company must hold it." },
    { v: "SELECTED", t: "Selected sites or crews", d: "Only people at the sites or in the crews you choose." },
  ];
  return (
    <Modal title={initial ? "Edit certification" : "Add a certification"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); run(() => saveCertificationType(f), onClose); }} className="w-full max-w-xl space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <FieldGrid columns={2}>
          <Field label="Name" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} required placeholder="e.g. OSHA 30 Construction" autoFocus /></Field>
          <Field label="Category" optional><Input value={f.category} onChange={(e) => set("category", e.target.value)} list="cert-categories" placeholder="e.g. Safety training" /><datalist id="cert-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Issuing body" optional><Input value={f.issuingBody} onChange={(e) => set("issuingBody", e.target.value)} placeholder="e.g. OSHA" /></Field>
          <Field label="Valid for (months)" optional hint="Leave blank if it does not expire."><Input value={f.validityMonths} onChange={(e) => set("validityMonths", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 24" /></Field>
        </FieldGrid>
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-ink-800">Who must hold it</legend>
          <div className="grid gap-2">
            {scopes.map((s) => (
              <label key={s.v} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors", f.requiredScope === s.v ? "border-brand-500 bg-orchid-soft/40" : "border-ink-200 hover:bg-surface-hover")}>
                <input type="radio" name="scope" checked={f.requiredScope === s.v} onChange={() => set("requiredScope", s.v)} className="mt-1" />
                <span><span className="font-medium text-ink-900">{s.t}</span><span className="block text-xs text-ink-500">{s.d}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        {f.requiredScope === "SELECTED" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {([["requiredSiteIds", "Sites", sites], ["requiredCrewIds", "Crews", crews]] as const).map(([key, label, opts]) => (
              <fieldset key={key} className="min-w-0">
                <legend className="mb-1.5 text-xs font-semibold text-ink-800">{label}</legend>
                {opts.length === 0 ? <p className="text-xs text-ink-500">None yet.</p> : (
                  <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-ink-200 p-2">
                    {opts.map((o) => (
                      <li key={o.id}><label className="flex items-center gap-2 text-sm text-ink-800"><input type="checkbox" checked={f[key].includes(o.id)} onChange={() => toggle(key, o.id)} /><span className="truncate">{o.name}</span></label></li>
                    ))}
                  </ul>
                )}
              </fieldset>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={btnPrimary}>{pending ? <><Spinner /> Saving…</> : initial ? "Save changes" : "Add certification"}</button>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteType({ row, onClose }: { row: CatalogRow; onClose: () => void }) {
  const { run, pending, error } = useAct();
  return (
    <Modal title="Remove this certification?" onClose={onClose}>
      <div className="max-w-md space-y-3">
        <p className="text-sm text-ink-700"><span className="font-semibold text-ink-900">{row.name}</span> will no longer be tracked or required. People’s existing records stay, as plain records.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button disabled={pending} onClick={() => run(() => deleteCertificationType(row.id), onClose)} className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">{pending ? <><Spinner /> Removing…</> : "Remove"}</button>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

/** The catalog: what the company tracks and who must hold each certification. */
export function CertificationCatalog({ rows, sites, crews, categories, canEdit }: { rows: CatalogRow[]; sites: Opt[]; crews: Opt[]; categories: string[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<CatalogRow | "new" | null>(null);
  const [removing, setRemoving] = useState<CatalogRow | null>(null);
  return (
    <section aria-labelledby="catalog" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="catalog" className="text-sm font-semibold text-ink-900">Certifications you track</h2>
          <p className="text-xs text-ink-500">Set who must hold each one and Reldro shows where the gaps are.</p>
        </div>
        {canEdit && <button type="button" onClick={() => setEditing("new")} className={cn(btnPrimary, "inline-flex items-center gap-1.5")}><Plus size={15} aria-hidden />Add certification</button>}
      </div>
      {rows.length === 0 ? (
        <div className="surface border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium text-ink-900">No certifications set up yet</p>
          <p className="mx-auto mt-1 max-w-[44ch] text-sm text-ink-600">Add the certifications your crews need, such as OSHA 30, aerial lift or first aid, and say who must hold each one.</p>
        </div>
      ) : (
        <ul className="surface divide-y divide-ink-100 overflow-hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate text-sm font-semibold text-ink-900">{r.name}</p>
                <p className="truncate text-xs text-ink-500">{[r.category, r.issuingBody, r.validityMonths ? `Valid ${r.validityMonths} months` : "Does not expire"].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="min-w-0 basis-40 text-xs"><p className="text-ink-500">Required for</p><p className="font-medium text-ink-900">{r.requirement}</p></div>
              <div className="min-w-0 basis-28 text-xs"><p className="text-ink-500">Held</p><p className="font-medium tabular-nums text-ink-900">{r.holders}</p></div>
              {canEdit && (
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"><Pencil size={15} aria-hidden /></button>
                  <button type="button" onClick={() => setRemoving(r)} aria-label={`Remove ${r.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-coral-soft/50 hover:text-danger"><Trash2 size={15} aria-hidden /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <TypeEditor initial={editing === "new" ? undefined : editing} sites={sites} crews={crews} categories={categories} onClose={() => setEditing(null)} />}
      {removing && <DeleteType row={removing} onClose={() => setRemoving(null)} />}
    </section>
  );
}

export { btnGhost };
