"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { unwrap } from "@/lib/actionResult";
import { MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { REPEATS } from "@/lib/safety/repeat";
import { useRouter } from "next/navigation";
import { completeInspection, createTemplate, scheduleInspection, addStarterTemplates, deleteTemplate, duplicateTemplate, updateTemplate, raiseReportFromInspection } from "@/lib/actions/safetyInspections";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { btnGhost, btnPrimary, btnSecondary, FormPanel, FormSection } from "@/components/ui/FormParts";
import { useAct } from "./useAct";
import { Alert } from "@/components/ui/Alert";

export function ScheduleInspectionForm({ templates, sites, people, onSuccess }: { onSuccess?: () => void; templates: { id: string; name: string }[]; sites: { id: string; name: string }[]; people: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(scheduleInspection, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) { router.refresh(); onSuccess?.(); } }, [state, router, onSuccess]);
  return (
    <form action={formAction} className={onSuccess ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5"}>
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

export function StarterTemplatesButton() {
  const { run, pending, error } = useAct();
  return (
    <div>
      <button disabled={pending} onClick={() => run(() => addStarterTemplates())} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Adding…" : "Add starter checklists"}</button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
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

/** Compact primary action: the scheduling form opens in a dialog instead of sitting on the page. */
export function ScheduleInspectionButton({ templates, sites, people, defaultOpen = false }: { templates: { id: string; name: string }[]; sites: { id: string; name: string }[]; people: { id: string; name: string }[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">Schedule inspection</button>
      {open && (
        <Modal title="Schedule an inspection" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-ink-600">Choose a checklist, site, owner, and due date.</p>
          <ScheduleInspectionForm templates={templates} sites={sites} people={people} onSuccess={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

/* ---- Checklist builder ------------------------------------------------------------------------------------ */

const KINDS = [
  { key: "SITE_INSPECTION", label: "Site inspection" },
  { key: "READINESS", label: "Readiness check" },
  { key: "OBSERVATION", label: "Observation" },
] as const;
type BuilderItem = { key: number; label: string; critical: boolean };
export type ChecklistInitial = { id: string; name: string; kind: string; frequencyDays: number | null; items: { label: string; critical?: boolean }[] };

let nextKey = 1;
const newItem = (label = "", critical = false): BuilderItem => ({ key: nextKey++, label, critical });

/**
 * One builder for creating and editing a checklist: Basics, Schedule, Checklist items. Items are individual rows that
 * can be reordered, marked critical and removed. It still saves through the same actions as before (items are sent as
 * lines, with a leading * for critical).
 */
export function ChecklistBuilder({ initial, onDone, onCancel }: { initial?: ChecklistInitial; onDone: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<string>(initial?.kind ?? "SITE_INSPECTION");
  const [repeats, setRepeats] = useState(Boolean(initial?.frequencyDays));
  const preset = initial?.frequencyDays && REPEATS.some((r) => r.days === initial.frequencyDays) ? String(initial.frequencyDays) : initial?.frequencyDays ? "custom" : "7";
  const [repeatChoice, setRepeatChoice] = useState(preset);
  const [customDays, setCustomDays] = useState(initial?.frequencyDays && preset === "custom" ? String(initial.frequencyDays) : "");
  const [items, setItems] = useState<BuilderItem[]>(() => (initial?.items.length ? initial.items.map((i) => newItem(i.label, Boolean(i.critical))) : [newItem(), newItem(), newItem()]));
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const inputs = useRef(new Map<number, HTMLInputElement | null>());

  const filled = items.filter((i) => i.label.trim());
  const nameError = touched && !name.trim() ? "Name the checklist." : undefined;
  const itemsError = touched && filled.length === 0 ? "Add at least one item." : undefined;
  const days = !repeats ? null : repeatChoice === "custom" ? Math.round(Number(customDays)) || null : Number(repeatChoice);
  const daysError = touched && repeats && repeatChoice === "custom" && !(days && days > 0) ? "Enter a number of days." : undefined;

  const focusLater = (key: number) => setTimeout(() => inputs.current.get(key)?.focus(), 0);
  const addAfter = (index: number) => { const it = newItem(); setItems((l) => [...l.slice(0, index + 1), it, ...l.slice(index + 1)]); focusLater(it.key); };
  const update = (key: number, patch: Partial<BuilderItem>) => setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const remove = (key: number) => setItems((l) => (l.length > 1 ? l.filter((i) => i.key !== key) : l.map((i) => (i.key === key ? { ...i, label: "", critical: false } : i))));
  const move = (from: number, to: number) => setItems((l) => { if (to < 0 || to >= l.length) return l; const n = [...l]; const [it] = n.splice(from, 1); n.splice(to, 0, it); return n; });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim() || filled.length === 0 || daysError) return;
    setPending(true);
    setError(null);
    const lines = filled.map((i) => `${i.critical ? "* " : ""}${i.label.trim().replace(/^\*\s*/, "")}`).join("\n");
    try {
      if (initial) {
        unwrap(await updateTemplate(initial.id, { name, kind, frequencyDays: days ? String(days) : "", items: lines }));
      } else {
        const fd = new FormData();
        fd.set("name", name);
        fd.set("kind", kind);
        if (days) fd.set("frequencyDays", String(days));
        fd.set("items", lines);
        const res = await createTemplate(undefined, fd);
        if (res?.error) throw new Error(res.error);
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the checklist.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <FormPanel
        title={initial ? "Edit checklist" : "New checklist"}
        description="Build the list inspectors work through. Mark the items that must never fail as critical."
        onClose={onCancel}
        actions={
          <>
            <button disabled={pending} className={btnPrimary}>{pending ? "Saving…" : initial ? "Save changes" : "Save checklist"}</button>
            <button type="button" onClick={onCancel} className={btnSecondary}>Cancel</button>
            <span className="ml-auto text-xs text-ink-500"><span className="text-danger">*</span> required</span>
          </>
        }
      >
        {error && <div className="px-4 pt-4 sm:px-5"><Alert tone="error">{error}</Alert></div>}
        <FormSection title="Basics">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Field label="Checklist name" required error={nameError}><Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. Electrical room readiness" autoFocus={!initial} /></Field>
            <div>
              <span className="text-xs font-semibold text-ink-800">Type</span>
              <div role="radiogroup" aria-label="Type" className="mt-1 flex rounded-lg bg-ink-100 p-0.5">
                {KINDS.map((k) => (
                  <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} onClick={() => setKind(k.key)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${kind === k.key ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.1)]" : "text-ink-600 hover:text-ink-900"}`}>{k.label}</button>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Schedule">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span><span className="block text-sm font-medium text-ink-900">Does this checklist repeat?</span><span className="block text-xs text-ink-500">Repeating checklists are rescheduled after each inspection.</span></span>
            <button type="button" role="switch" aria-checked={repeats} onClick={() => setRepeats((r) => !r)} className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${repeats ? "bg-brand-700" : "bg-ink-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${repeats ? "left-[1.125rem]" : "left-0.5"}`} /></button>
          </label>
          {repeats && (
            <div className="flex flex-wrap items-start gap-3">
              <Field label="Repeats" className="w-48"><Select value={repeatChoice} onChange={(e) => setRepeatChoice(e.target.value)}>{REPEATS.map((r) => <option key={r.days} value={r.days}>{r.label}</option>)}<option value="custom">Custom…</option></Select></Field>
              {repeatChoice === "custom" && <Field label="Every (days)" required error={daysError} className="w-32"><Input type="number" min={1} value={customDays} onChange={(e) => setCustomDays(e.target.value)} /></Field>}
            </div>
          )}
        </FormSection>

        <FormSection title={`Checklist items · ${filled.length}`} hint="Press Enter for the next item. Drag the handle, or use the arrows, to reorder.">
          {itemsError && <p role="alert" className="text-xs font-medium text-danger">{itemsError}</p>}
          <ol className="space-y-1.5">
            {items.map((it, idx) => (
              <li
                key={it.key}
                draggable={dragKey === it.key}
                onDragOver={(e) => { if (dragKey !== null) e.preventDefault(); }}
                onDrop={() => { if (dragKey !== null) { move(items.findIndex((x) => x.key === dragKey), idx); setDragKey(null); } }}
                onDragEnd={() => setDragKey(null)}
                className={`flex items-center gap-1.5 rounded-lg border bg-white py-1 pl-1 pr-1.5 ${dragKey === it.key ? "border-brand-500 opacity-60" : "border-ink-300"} ${it.critical ? "border-l-[3px] border-l-danger" : ""}`}
              >
                <span onMouseDown={() => setDragKey(it.key)} onMouseUp={() => setDragKey(null)} title="Drag to reorder" aria-hidden className="flex h-8 w-6 shrink-0 cursor-grab select-none items-center justify-center text-ink-400 hover:text-ink-700">⋮⋮</span>
                <input
                  ref={(el) => { inputs.current.set(it.key, el); }}
                  value={it.label}
                  onChange={(e) => update(it.key, { label: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); if (it.label.trim()) addAfter(idx); }
                    else if (e.key === "Backspace" && !it.label && items.length > 1) { e.preventDefault(); const prev = items[idx - 1] ?? items[idx + 1]; remove(it.key); if (prev) focusLater(prev.key); }
                  }}
                  aria-label={`Item ${idx + 1}`}
                  placeholder={idx === 0 ? "e.g. Lockout/tagout applied" : "Add an item"}
                  className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
                <button type="button" role="switch" aria-checked={it.critical} onClick={() => update(it.key, { critical: !it.critical })} title="Critical items must pass" className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${it.critical ? "bg-coral-soft text-danger" : "text-ink-400 hover:bg-surface-hover hover:text-ink-700"}`}>Critical</button>
                <span className="hidden shrink-0 sm:flex">
                  <button type="button" aria-label="Move up" disabled={idx === 0} onClick={() => move(idx, idx - 1)} className="h-7 w-6 text-ink-400 hover:text-ink-800 disabled:opacity-30">↑</button>
                  <button type="button" aria-label="Move down" disabled={idx === items.length - 1} onClick={() => move(idx, idx + 1)} className="h-7 w-6 text-ink-400 hover:text-ink-800 disabled:opacity-30">↓</button>
                </span>
                <button type="button" aria-label={`Delete item ${idx + 1}`} onClick={() => remove(it.key)} className="h-7 w-7 shrink-0 rounded-md text-ink-400 hover:bg-coral-soft/60 hover:text-danger">×</button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => addAfter(items.length - 1)} className={`${btnGhost} !px-2 !py-1 !text-orchid-deep`}>+ Add item</button>
        </FormSection>
      </FormPanel>
    </form>
  );
}

/** "+ New checklist": the builder stays out of the way until asked for. */
export function NewChecklist({ empty = false }: { empty?: boolean }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="p-3 sm:p-4"><ChecklistBuilder onDone={() => setOpen(false)} onCancel={() => setOpen(false)} /></div>;
  return <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${empty ? "" : "border-b border-ink-100"}`}><span className="text-xs text-ink-500">{empty ? "No checklists yet." : "Checklists your inspectors run."}</span><button type="button" onClick={() => setOpen(true)} className={`${btnPrimary} !px-4 !py-1.5 !text-xs`}>+ New checklist</button></div>;
}

/** Row menu for a checklist: Edit opens the builder in a dialog, Duplicate copies it, Delete asks first. */
export function ChecklistMenu({ template }: { template: ChecklistInitial }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "edit" | "delete">(null);
  const box = useRef<HTMLDivElement>(null);
  const { run, pending, error, setError } = useAct();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const close = () => { setDialog(null); setError(null); };
  const item = "block w-full px-3 py-1.5 text-left text-sm text-ink-800 hover:bg-surface-hover";
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={`Actions for ${template.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"><MoreHorizontal size={16} aria-hidden /></button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-40 rounded-lg border border-ink-200 bg-white py-1 shadow-[0_6px_20px_-6px_rgba(42,10,12,0.18)]">
          <button role="menuitem" onClick={() => { setOpen(false); setDialog("edit"); }} className={item}>Edit</button>
          <button role="menuitem" disabled={pending} onClick={() => { setOpen(false); run(() => duplicateTemplate(template.id)); }} className={item}>Duplicate</button>
          <div className="my-1 border-t border-ink-100" />
          <button role="menuitem" onClick={() => { setOpen(false); setDialog("delete"); }} className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-coral-soft/50">Delete</button>
        </div>
      )}
      {error && !dialog && <p role="alert" className="absolute right-0 top-9 z-20 w-56 rounded-lg bg-white p-2 text-xs text-danger shadow-lg">{error}</p>}
      {dialog === "edit" && <Modal title="Edit checklist" onClose={close} wide><ChecklistBuilder initial={template} onDone={close} onCancel={close} /></Modal>}
      {dialog === "delete" && (
        <Modal title="Delete this checklist?" onClose={close}>
          <div className="max-w-md space-y-3">
            <p className="text-sm text-ink-700"><span className="font-semibold text-ink-900">{template.name}</span> will be deleted, and inspections still scheduled with it will also be removed. A checklist that has completed inspections can’t be deleted, so those records are never lost. This can’t be undone.</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2"><button disabled={pending} onClick={() => run(() => deleteTemplate(template.id), close)} className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">{pending ? "Deleting…" : "Delete checklist"}</button><button type="button" onClick={close} className={btnSecondary}>Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
