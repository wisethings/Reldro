"use client";

import { useEffect, useState } from "react";
import {
  addResponder,
  messageReporter,
  openIncident,
  postIncidentEntry,
  removeResponder,
  reopenIncident,
  resolveIncident,
  setIncidentStatus,
  standDownIncident,
  updateIncidentDetails,
} from "@/lib/actions/safetyIncidents";
import { aiDraftCloseout } from "@/lib/actions/safetyAi";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { INCIDENT_ENTRY_TYPES, RESPONDER_ROLE_SUGGESTIONS } from "@/lib/safety/pack";
import { AiTextDraft } from "./AiTextDraft";
import { PhotoField } from "./PhotoField";
import { useAct } from "./useAct";
import { Alert } from "@/components/ui/Alert";

type Person = { id: string; name: string };

const primary = "rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40";
const secondary = "rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover disabled:opacity-40";

function ErrorLine({ error }: { error: string | null }) {
  return error ? <Alert tone="error">{error}</Alert> : null;
}

/** Shown to the safety team on a report with no incident response. Most reports never need one. */
export function OpenIncidentForm({ reportId, people, defaultLeadId }: { reportId: string; people: Person[]; defaultLeadId: string | null }) {
  const { run, pending, error } = useAct();
  const [lead, setLead] = useState(defaultLeadId ?? "");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <details className="rounded-lg bg-surface-muted p-3">
      <summary className="cursor-pointer text-sm font-medium text-ink-800">Open an incident response</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-ink-600">
          This opens a shared workspace with a response lead, a timeline, and a closeout. It does not contact emergency services or replace your emergency plan.
          Responders you name receive an email with a link if email is set up. The email contains no report details.
        </p>
        <ErrorLine error={error} />
        {notice && <p role="status" className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{notice}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Response lead" hint="Runs the response and closes it out. You can change this later.">
            <Select value={lead} onChange={(e) => setLead(e.target.value)}>
              <option value="">Choose later</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Why does this need a coordinated response?" optional>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Serious injury, multiple crews affected" />
          </Field>
        </div>
        <button disabled={pending} onClick={() => run(async () => setNotice(await openIncident(reportId, lead || null, reason)))} className={primary}>
          {pending ? "Opening…" : "Open incident response"}
        </button>
      </div>
    </details>
  );
}

export function IncidentDetailsForm({
  reportId,
  status,
  summary,
  nextAction,
  nextActionDueAtIso,
  leadId,
  people,
}: {
  reportId: string;
  status: string;
  summary: string;
  nextAction: string;
  nextActionDueAtIso: string | null
  leadId: string | null;
  people: Person[];
}) {
  const { run, pending, error } = useAct();
  const [s, setS] = useState(summary);
  const [next, setNext] = useState(nextAction);
  // The due time arrives as an instant and is shown in this device's time zone (the server doesn't know it).
  const [initialDue, setInitialDue] = useState("");
  const [due, setDue] = useState("");
  useEffect(() => {
    const v = nextActionDueAtIso ? new Date(new Date(nextActionDueAtIso).getTime() - new Date(nextActionDueAtIso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setInitialDue(v);
    setDue(v);
  }, [nextActionDueAtIso]);
  const [lead, setLead] = useState(leadId ?? "");
  const dirty = s !== summary || next !== nextAction || due !== initialDue || lead !== (leadId ?? "");
  return (
    <div className="space-y-3">
      <ErrorLine error={error} />
      <Field label="Where things stand" hint="A few plain sentences for anyone joining the response. Facts only.">
        <Textarea value={s} onChange={(e) => setS(e.target.value)} rows={3} maxLength={3000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Next action" className="sm:col-span-2">
          <Input value={next} onChange={(e) => setNext(e.target.value)} maxLength={500} placeholder="What happens next, and who does it" />
        </Field>
        <Field label="By when" optional>
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Field label="Response lead">
        <Select value={lead} onChange={(e) => setLead(e.target.value)}>
          <option value="">No lead yet</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={pending || !dirty}
          onClick={() => run(() => updateIncidentDetails(reportId, { summary: s, nextAction: next, nextActionDueAt: due ? new Date(due).toISOString() : null, leadId: lead || null }))}
          className={primary}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status === "ACTIVE" ? (
          <button disabled={pending} onClick={() => run(() => setIncidentStatus(reportId, "MONITORING"))} className={secondary}>Move to monitoring</button>
        ) : (
          <button disabled={pending} onClick={() => run(() => setIncidentStatus(reportId, "ACTIVE"))} className={secondary}>Back to active response</button>
        )}
      </div>
      <p className="text-xs text-ink-500">Monitoring means the immediate response is done and people are following up.</p>
    </div>
  );
}

export function ResponderManager({
  reportId,
  responders,
  people,
  canEdit,
}: {
  reportId: string;
  responders: { employeeId: string; name: string; role: string }[];
  people: Person[];
  canEdit: boolean;
}) {
  const { run, pending, error } = useAct();
  const [who, setWho] = useState("");
  const [role, setRole] = useState("");
  const taken = new Set(responders.map((r) => r.employeeId));
  return (
    <div className="space-y-3">
      <ErrorLine error={error} />
      {responders.length === 0 ? (
        <p className="text-sm text-ink-500">No other responders have been added.</p>
      ) : (
        <ul className="divide-y divide-ink-200/60 overflow-hidden rounded-lg bg-surface-muted">
          {responders.map((r) => (
            <li key={r.employeeId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-ink-900">{r.name}</span>
                {r.role && <span className="ml-2 text-xs text-ink-500">{r.role}</span>}
              </span>
              {canEdit && (
                <button disabled={pending} onClick={() => run(() => removeResponder(reportId, r.employeeId))} className="shrink-0 text-xs font-medium text-ink-500 hover:text-danger" aria-label={`Remove ${r.name}`}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto] sm:items-end">
          <Field label="Add a responder">
            <Select value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Choose a person</option>
              {people.filter((p) => !taken.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Role" optional>
            <Input list="responder-roles" value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} placeholder="e.g. Site lead" />
            <datalist id="responder-roles">{RESPONDER_ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          <button disabled={pending || !who} onClick={() => run(() => addResponder(reportId, who, role), () => { setWho(""); setRole(""); })} className={primary}>Add</button>
        </div>
      )}
      <p className="text-xs text-ink-500">Responders can read this report and the timeline and post updates. Investigation statements and safety-team-only notes stay restricted.</p>
    </div>
  );
}

/** Post an update, a decision, a note or photo evidence to the shared timeline. */
export function IncidentComposer({ reportId, isSafetyTeam }: { reportId: string; isSafetyTeam: boolean }) {
  const { run, pending, error } = useAct();
  const [kind, setKind] = useState<string>("UPDATE");
  const [message, setMessage] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [photoKey, setPhotoKey] = useState(0);
  const hint = INCIDENT_ENTRY_TYPES.find((t) => t.key === kind)?.hint;
  return (
    <form
      className="space-y-3"
      action={(fd) => {
        fd.set("reportId", reportId);
        fd.set("kind", kind);
        run(() => postIncidentEntry(fd), () => { setMessage(""); setRestricted(false); setPhotoKey((k) => k + 1); });
      }}
    >
      <ErrorLine error={error} />
      <div role="radiogroup" aria-label="Type of entry" className="flex flex-wrap gap-2">
        {INCIDENT_ENTRY_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={kind === t.key}
            onClick={() => setKind(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${kind === t.key ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-surface-hover"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Textarea name="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} aria-label={hint} placeholder={hint} />
      {kind === "EVIDENCE" && <PhotoField key={photoKey} max={4} label="Add photos" />}
      {isSafetyTeam && (
        <label className="flex items-start gap-2 text-xs text-ink-700">
          <input type="checkbox" name="restricted" checked={restricted} onChange={(e) => setRestricted(e.target.checked)} className="mt-0.5" />
          <span><span className="font-medium">Safety team only.</span> Use for medical or personal details. Responders outside the safety team cannot see this entry or its photos.</span>
        </label>
      )}
      <button disabled={pending || (!message.trim() && kind !== "EVIDENCE")} className={primary}>{pending ? "Posting…" : "Add to timeline"}</button>
    </form>
  );
}

export function ReporterMessageBox({ reportId, anonymous }: { reportId: string; anonymous: boolean }) {
  const { run, pending, error } = useAct();
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <ErrorLine error={error} />
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Ask a question or share what's happening, in plain words" aria-label="Message to the reporter" />
      <p className="text-xs text-ink-500">
        {anonymous
          ? "The reporter submitted without a name. They see this only if they open their private follow-up page with their case code. Do not include anything that could identify them."
          : "The reporter can read this on their report."}
      </p>
      <button disabled={pending || !text.trim()} onClick={() => run(() => messageReporter(reportId, text), () => setText(""))} className={secondary}>
        {pending ? "Sending…" : "Send to reporter"}
      </button>
    </div>
  );
}

export function CloseoutForm({
  reportId,
  resolved,
  closeoutSummary,
  standDownReason,
  openActions,
}: {
  reportId: string;
  resolved: boolean;
  closeoutSummary: string;
  standDownReason: string;
  openActions: number;
}) {
  const { run, pending, error } = useAct();
  const [text, setText] = useState(closeoutSummary);
  const [why, setWhy] = useState("");

  if (resolved) {
    return (
      <div className="space-y-3">
        <ErrorLine error={error} />
        {standDownReason && <p className="text-sm text-ink-700"><span className="font-medium">Stood down:</span> {standDownReason}</p>}
        <p className="whitespace-pre-wrap text-sm text-ink-800">{closeoutSummary}</p>
        <button disabled={pending} onClick={() => run(() => reopenIncident(reportId))} className={secondary}>Reopen response</button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ErrorLine error={error} />
      <Field label="Closeout summary" hint="What happened, what was decided, and what happens next. A person writes and submits this.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={4000} />
      </Field>
      <AiTextDraft label="Draft a closeout from the timeline" generate={() => aiDraftCloseout(reportId)} useLabel="Use this draft" onUse={(t) => setText(t)} />
      {openActions > 0 && (
        <p className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-700">
          {openActions} corrective action{openActions === 1 ? " is" : "s are"} still open. Resolving the response does not close them. They stay on this report until each one is verified.
        </p>
      )}
      <button disabled={pending || text.trim().length < 20} onClick={() => run(() => resolveIncident(reportId, text))} className={primary}>
        {pending ? "Saving…" : "Resolve incident response"}
      </button>

      <details className="rounded-lg bg-surface-muted p-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-800">This did not need an incident response</summary>
        <div className="mt-3 space-y-2">
          <Field label="Why not?" hint="The report carries on as a normal report and keeps its history.">
            <Input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} />
          </Field>
          <button disabled={pending || why.trim().length < 5} onClick={() => run(() => standDownIncident(reportId, why))} className={secondary}>Stand down</button>
        </div>
      </details>
    </div>
  );
}
