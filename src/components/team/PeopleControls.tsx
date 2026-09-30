"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { deletePerson, updatePerson } from "@/lib/actions/team";
import { resendInvite, type ResendInviteResult } from "@/lib/actions/invites";
import { setPersonRoles } from "@/lib/actions/safetySettings";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Field";
import { useAct } from "@/components/safety/useAct";
import { InviteResult } from "./InviteResult";

type Opt = { id: string; name: string };

/** Site and crew as one joined control: it reads as a single "where they work" area rather than two loose dropdowns. */
export function PersonAssignment({ employeeId, siteId, crewId, sites, crews }: { employeeId: string; siteId: string | null; crewId: string | null; sites: Opt[]; crews: Opt[] }) {
  const { run, pending, error } = useAct();
  const sel = "min-w-0 flex-1 truncate bg-transparent py-1 pl-2 text-xs text-ink-800 outline-none focus:bg-surface-muted disabled:opacity-60";
  return (
    <div>
      <div className="flex divide-x divide-ink-200 overflow-hidden rounded-lg border border-ink-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 hover:border-ink-300">
        <select aria-label="Home site" defaultValue={siteId ?? ""} disabled={pending} onChange={(e) => run(() => setPersonRoles(employeeId, { siteId: e.target.value || null }))} className={sel}>
          <option value="">No home site</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select aria-label="Crew" defaultValue={crewId ?? ""} disabled={pending} onChange={(e) => run(() => setPersonRoles(employeeId, { departmentId: e.target.value || null }))} className={sel}>
          <option value="">No crew</option>
          {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Supervisor and Safety lead as two small toggles. Off is nearly invisible so the name stays the strongest thing in the row. */
export function PersonAccess({ employeeId, isSupervisor, isSafetyLead }: { employeeId: string; isSupervisor: boolean; isSafetyLead: boolean }) {
  const { run, pending, error } = useAct();
  const [sup, setSup] = useState(isSupervisor);
  const [lead, setLead] = useState(isSafetyLead);
  const pill = (on: boolean) => `rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-60 ${on ? "bg-orchid-soft text-orchid-deep" : "text-ink-400 hover:bg-surface-hover hover:text-ink-700"}`;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" role="switch" aria-checked={sup} disabled={pending} onClick={() => { setSup(!sup); run(() => setPersonRoles(employeeId, { isSupervisor: !sup })); }} className={pill(sup)}>Supervisor</button>
      <button type="button" role="switch" aria-checked={lead} disabled={pending} onClick={() => { setLead(!lead); run(() => setPersonRoles(employeeId, { isSafetyLead: !lead })); }} className={pill(lead)}>Safety lead</button>
      {error && <span className="w-full text-xs text-danger">{error}</span>}
    </div>
  );
}

type Dialog = null | "edit" | "role" | "delete";

/** The "•••" menu: everything an admin does less often, kept out of the row until asked for. */
export function PersonMenu({ userId, employeeId, name, jobTitle, isSupervisor, isSafetyLead, pendingInvite, isSelf }: { userId: string; employeeId: string; name: string; jobTitle: string; isSupervisor: boolean; isSafetyLead: boolean; pendingInvite: boolean; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [invite, setInvite] = useState<ResendInviteResult>();
  const { run, pending, error, setError } = useAct();
  const box = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(name);
  const [t, setT] = useState(jobTitle);
  const [sup, setSup] = useState(isSupervisor);
  const [lead, setLead] = useState(isSafetyLead);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const close = () => { setDialog(null); setError(null); };
  const item = "block w-full px-3 py-1.5 text-left text-sm text-ink-800 hover:bg-surface-hover disabled:text-ink-400 disabled:hover:bg-transparent";

  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={`Actions for ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900">
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-ink-200 bg-white py-1 shadow-[0_6px_20px_-6px_rgba(42,10,12,0.18)]">
          <button role="menuitem" className={item} onClick={() => { setOpen(false); setDialog("edit"); }}>Edit details</button>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); setDialog("role"); }}>Change role</button>
          <button role="menuitem" className={item} disabled={!pendingInvite || pending} title={pendingInvite ? undefined : "This person has already signed in"} onClick={() => { setOpen(false); run(async () => setInvite(await resendInvite(userId))); }}>Resend invite</button>
          {!isSelf && (
            <>
              <div className="my-1 border-t border-ink-100" />
              <button role="menuitem" className="block w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-coral-soft/50" onClick={() => { setOpen(false); setDialog("delete"); }}>Delete person</button>
            </>
          )}
        </div>
      )}
      {invite && <div className="absolute right-0 top-9 z-20 w-72"><InviteResult result={invite} className="rounded-lg border border-ink-200 bg-white p-3 text-left text-xs shadow-lg" /></div>}
      {error && !dialog && <p role="alert" className="absolute right-0 top-9 z-20 w-56 rounded-lg bg-white p-2 text-xs text-danger shadow-lg">{error}</p>}

      {dialog === "edit" && (
        <Modal title={`Edit ${name}`} onClose={close}>
          <form onSubmit={(e) => { e.preventDefault(); run(() => updatePerson(employeeId, { name: n, jobTitle: t }), close); }} className="max-w-md space-y-3">
            <Field label="Full name"><Input value={n} onChange={(e) => setN(e.target.value)} required /></Field>
            <Field label="Job title"><Input value={t} onChange={(e) => setT(e.target.value)} required /></Field>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2"><button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button><button type="button" onClick={close} className="rounded-full border border-ink-300 px-5 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">Cancel</button></div>
          </form>
        </Modal>
      )}
      {dialog === "role" && (
        <Modal title={`Change role for ${name}`} onClose={close}>
          <div className="max-w-md space-y-3">
            <p className="text-sm text-ink-600">Supervisors see reports at their own site. Safety leads see every report and investigation. Everyone else sees only their own.</p>
            <label className="flex items-start gap-2.5 rounded-lg border border-ink-200 p-3 text-sm"><input type="checkbox" checked={sup} onChange={(e) => setSup(e.target.checked)} className="mt-0.5" /><span><span className="block font-medium text-ink-900">Supervisor</span><span className="text-xs text-ink-500">Runs a site or crew.</span></span></label>
            <label className="flex items-start gap-2.5 rounded-lg border border-ink-200 p-3 text-sm"><input type="checkbox" checked={lead} onChange={(e) => setLead(e.target.checked)} className="mt-0.5" /><span><span className="block font-medium text-ink-900">Safety lead</span><span className="text-xs text-ink-500">Part of the safety team.</span></span></label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2"><button disabled={pending} onClick={() => run(() => setPersonRoles(employeeId, { isSupervisor: sup, isSafetyLead: lead }), close)} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Save role"}</button><button type="button" onClick={close} className="rounded-full border border-ink-300 px-5 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">Cancel</button></div>
          </div>
        </Modal>
      )}
      {dialog === "delete" && (
        <Modal title="Delete this person?" onClose={close}>
          <div className="max-w-md space-y-3">
            <p className="text-sm text-ink-700"><span className="font-semibold text-ink-900">{name}</span> will lose access immediately, and their login, acknowledgements and qualifications are deleted. Reports and investigations they were part of stay in your records. This can’t be undone.</p>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2"><button disabled={pending} onClick={() => run(() => deletePerson(employeeId), close)} className="rounded-full bg-danger px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">{pending ? "Deleting…" : "Delete person"}</button><button type="button" onClick={close} className="rounded-full border border-ink-300 px-5 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">Cancel</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
