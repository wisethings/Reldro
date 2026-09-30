"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { deleteQualifications, setQualificationsExpiry, updateQualification } from "@/lib/actions/safetyTraining";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { useAct } from "./useAct";

export type QualStatus = "expired" | "soon" | "current";
export type QualRow = { id: string; employee: string; name: string; status: QualStatus; issued: string; expires: string; expiresIso: string; issuedIso: string; rel: string | null; group: string | null };

const GRID = "md:grid md:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem_6.5rem_9rem_2rem] md:items-center md:gap-3";

export function StatusBadge({ status }: { status: QualStatus }) {
  return status === "expired" ? <Badge tone="red">Expired</Badge> : status === "soon" ? <Badge tone="amber">Expires soon</Badge> : <Badge tone="green">Current</Badge>;
}

/** Confirmation step shared by the row menu and the bulk bar. */
function ConfirmRemove({ count, label, onClose, ids }: { count: number; label: string; onClose: () => void; ids: string[] }) {
  const { run, pending, error } = useAct();
  return (
    <Modal title={count === 1 ? "Remove this qualification?" : `Remove ${count} qualifications?`} onClose={onClose}>
      <div className="max-w-md space-y-3">
        <p className="text-sm text-ink-700">{count === 1 ? <><span className="font-semibold text-ink-900">{label}</span> will be removed from the record.</> : `${count} qualification records will be removed.`} This can’t be undone.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button disabled={pending} onClick={() => run(() => deleteQualifications(ids), onClose)} className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">{pending ? "Removing…" : "Remove"}</button>
          <button type="button" onClick={onClose} className="rounded-full border border-ink-300 px-5 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

function RowMenu({ row, onRemove }: { row: QualRow; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={`Actions for ${row.employee}, ${row.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900">
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-ink-200 bg-white py-1 shadow-[0_6px_20px_-6px_rgba(42,10,12,0.18)]">
          <Link role="menuitem" href={`/dashboard/training/qualifications/${row.id}`} className="block px-3 py-1.5 text-sm text-ink-800 hover:bg-surface-hover">View and edit</Link>
          <button role="menuitem" onClick={() => { setOpen(false); onRemove(); }} className="block w-full px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-coral-soft/50 hover:text-danger">Remove</button>
        </div>
      )}
    </div>
  );
}

export function QualificationTable({ rows }: { rows: QualRow[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [removeIds, setRemoveIds] = useState<string[] | null>(null);
  const [expiry, setExpiry] = useState("");
  const { run, pending, error } = useAct();

  // Selection never outlives its rows, for example after a page change.
  useEffect(() => { setPicked((p) => new Set([...p].filter((id) => rows.some((r) => r.id === id)))); }, [rows]);
  const allOn = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const ids = [...picked];

  return (
    <div className="surface">
      {picked.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-xl border-b border-ink-200 bg-orchid-soft/60 px-4 py-2 text-sm">
          <span className="font-medium text-ink-900">{picked.size} selected</span>
          <label className="flex items-center gap-2 text-xs text-ink-700">
            New expiry date
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-8 rounded-lg border border-ink-300 bg-white px-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </label>
          <button disabled={!expiry || pending} onClick={() => run(() => setQualificationsExpiry(ids, expiry), () => { setPicked(new Set()); setExpiry(""); })} className="rounded-full bg-brand-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40">{pending ? "Updating…" : "Update expiry"}</button>
          <button onClick={() => setRemoveIds(ids)} className="rounded-full border border-ink-300 bg-white px-3.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-surface-hover">Remove</button>
          <button onClick={() => setPicked(new Set())} className="ml-auto text-xs font-medium text-ink-600 hover:text-ink-900">Clear selection</button>
          {error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
        </div>
      )}
      <div role="table">
        <div role="row" className={`hidden border-b border-ink-200 bg-ink-100 px-4 py-2 text-xs font-medium text-ink-700 ${picked.size === 0 ? "rounded-t-xl" : ""} ${GRID}`}>
          <input type="checkbox" aria-label="Select all on this page" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(rows.map((r) => r.id)))} />
          <span>Employee</span><span>Qualification</span><span>Status</span><span>Issued</span><span>Expires</span><span className="sr-only">Actions</span>
        </div>
        <div role="rowgroup">
          {rows.map((r, i) => (
            <div key={r.id}>
              {r.group && <p className={`bg-surface-muted/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide ${r.status === "expired" ? "text-danger" : r.status === "soon" ? "text-amber-deep" : "text-ink-500"} ${i > 0 ? "border-t border-ink-100" : ""}`}>{r.group}</p>}
              <div
                role="row"
                onClick={(e) => { if (!(e.target as HTMLElement).closest("button,a,input,label")) router.push(`/dashboard/training/qualifications/${r.id}`); }}
                className={`relative cursor-pointer border-l-2 px-4 py-2.5 hover:bg-surface-hover ${i > 0 && !r.group ? "border-t border-ink-100" : ""} ${picked.has(r.id) ? "bg-orchid-soft/40" : ""} ${r.status === "expired" ? "border-l-danger" : r.status === "soon" ? "border-l-amber-deep/70" : "border-l-transparent"} ${GRID}`}
              >
                <input type="checkbox" aria-label={`Select ${r.employee}, ${r.name}`} checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="absolute left-4 top-3.5 md:static" />
                <div className="min-w-0 pl-7 md:pl-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{r.employee}</p>
                  <p className="truncate text-sm font-medium text-ink-800 md:hidden">{r.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500 md:hidden"><StatusBadge status={r.status} /><span>{r.expires}{r.rel ? ` · ${r.rel}` : ""}</span></div>
                </div>
                <p className="hidden min-w-0 truncate text-sm font-medium text-ink-900 md:block"><Link href={`/dashboard/training/qualifications/${r.id}`} className="outline-none hover:text-orchid-deep focus-visible:underline">{r.name}</Link></p>
                <div className="hidden md:block"><StatusBadge status={r.status} /></div>
                <p className="hidden text-xs text-ink-500 md:block">{r.issued}</p>
                <p className="hidden text-sm md:block"><span className={r.status === "expired" ? "font-semibold text-danger" : r.status === "soon" ? "font-semibold text-amber-deep" : "text-ink-700"}>{r.expires}</span>{r.rel && <span className="block text-xs font-normal text-ink-500">{r.rel}</span>}</p>
                <div className="absolute right-3 top-2 md:static"><RowMenu row={r} onRemove={() => setRemoveIds([r.id])} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {removeIds && <ConfirmRemove ids={removeIds} count={removeIds.length} label={rows.find((r) => r.id === removeIds[0]) ? `${rows.find((r) => r.id === removeIds[0])!.employee}, ${rows.find((r) => r.id === removeIds[0])!.name}` : "This record"} onClose={() => { setRemoveIds(null); setPicked(new Set()); }} />}
    </div>
  );
}

/** Edit form on the qualification detail page. */
export function QualificationEditForm({ id, name, issuedIso, expiresIso }: { id: string; name: string; issuedIso: string; expiresIso: string }) {
  const [n, setN] = useState(name);
  const [i, setI] = useState(issuedIso);
  const [e, setE] = useState(expiresIso);
  const { run, pending, error } = useAct();
  const [saved, setSaved] = useState(false);
  return (
    <form onSubmit={(ev) => { ev.preventDefault(); setSaved(false); run(() => updateQualification(id, { name: n, issuedOn: i, expiresOn: e }), () => setSaved(true)); }} className="grid gap-3 sm:grid-cols-3">
      <Field label="Qualification" className="sm:col-span-3"><Input value={n} onChange={(x) => setN(x.target.value)} required /></Field>
      <Field label="Issued" optional><Input type="date" value={i} onChange={(x) => setI(x.target.value)} /></Field>
      <Field label="Expires" optional><Input type="date" value={e} onChange={(x) => setE(x.target.value)} /></Field>
      <div className="flex items-end gap-3"><button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Save changes"}</button>{saved && !error && <span role="status" className="text-xs text-sage-deep">Saved</span>}</div>
      {error && <p role="alert" className="text-sm text-danger sm:col-span-3">{error}</p>}
    </form>
  );
}

export function RemoveQualificationButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-700 hover:bg-surface-hover">Remove</button>
      {open && <ConfirmRemove ids={[id]} count={1} label={label} onClose={() => { setOpen(false); router.push("/dashboard/training?tab=qualifications"); }} />}
    </>
  );
}
