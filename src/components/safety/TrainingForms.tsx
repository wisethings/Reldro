"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeTalk, addQualification, createToolboxTalk, deleteQualification, deleteToolboxTalk } from "@/lib/actions/safetyTraining";
import { aiDraftToolboxTalk } from "@/lib/actions/safetyAi";
import { setPersonRoles } from "@/lib/actions/safetySettings";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { AiTextDraft } from "./AiTextDraft";
import { useAct } from "./useAct";

export function TalkForm({ sites, lockSiteId }: { sites: { id: string; name: string }[]; lockSiteId: string | null }) {
  const [state, formAction, pending] = useActionState(createToolboxTalk, undefined);
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [content, setContent] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const router = useRouter();
  useEffect(() => { if (state?.success) { setTopic(""); setSource(""); setContent(""); setAiDrafted(false); router.refresh(); } }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="aiDrafted" value={aiDrafted ? "1" : "0"} />
      {state?.error && <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Title" required><Input name="title" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Ladder setup and inspection" required /></Field>
        <Field label="For">
          {lockSiteId ? <Input value="Your site" disabled /> : (
            <Select name="siteId" defaultValue=""><option value="">Whole company</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          )}
        </Field>
        <Field label="Date"><Input name="scheduledFor" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
      </div>
      <Field label="Approved source material" optional hint="Paste a company procedure, a policy excerpt or a lesson from a past investigation. An AI draft uses only this text.">
        <Textarea name="sourceMaterial" value={source} onChange={(e) => setSource(e.target.value)} rows={4} />
      </Field>
      <AiTextDraft
        label="Draft a talk outline from this material"
        generate={() => aiDraftToolboxTalk(topic, source)}
        useLabel="Use as the talk content"
        onUse={(text) => { setContent(text); setAiDrafted(true); }}
      />
      <Field label="Talk content" required hint="What the supervisor will cover. You can write it yourself or edit a draft.">
        <Textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} rows={7} required />
      </Field>
      <button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Publishing…" : "Publish talk"}</button>
    </form>
  );
}

export function AcknowledgeButton({ talkId }: { talkId: string }) {
  const { run, pending, error } = useAct();
  return (
    <div>
      <button disabled={pending} onClick={() => run(() => acknowledgeTalk(talkId))} className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "I attended and understood"}</button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DeleteTalkButton({ talkId }: { talkId: string }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => confirm("Delete this talk and its acknowledgements?") && run(() => deleteToolboxTalk(talkId))} className="text-xs text-danger hover:underline">Delete</button>;
}

export function QualificationForm({ people, suggestions }: { people: { id: string; name: string }[]; suggestions: string[] }) {
  const [state, formAction, pending] = useActionState(addQualification, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" key={state?.success ? "x" : "y"}>
      <Field label="Person"><Select name="employeeId" required defaultValue=""><option value="" disabled>Choose…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Qualification"><Input name="name" list="qual-suggestions" required placeholder="e.g. OSHA 30" /><datalist id="qual-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist></Field>
      <Field label="Issued" optional><Input name="issuedOn" type="date" /></Field>
      <Field label="Expires" optional><Input name="expiresOn" type="date" /></Field>
      <div className="flex items-end"><button disabled={pending} className="w-full rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Record"}</button></div>
      {state?.error && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-5">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep sm:col-span-2 lg:col-span-5">{state.success}</p>}
    </form>
  );
}

export function DeleteQualificationButton({ id }: { id: string }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => confirm("Remove this qualification record?") && run(() => deleteQualification(id))} className="text-xs text-danger hover:underline">Remove</button>;
}

export function PersonRoleControls({
  employeeId,
  siteId,
  isSafetyLead,
  isSupervisor,
  sites,
}: {
  employeeId: string;
  siteId: string | null;
  isSafetyLead: boolean;
  isSupervisor: boolean;
  sites: { id: string; name: string }[];
}) {
  const { run, pending, error } = useAct();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select aria-label="Home site" defaultValue={siteId ?? ""} disabled={pending} onChange={(e) => run(() => setPersonRoles(employeeId, { siteId: e.target.value || null }))} className="w-auto py-1 text-xs">
        <option value="">No home site</option>
        {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
      <label className="flex items-center gap-1.5 text-xs text-ink-700"><input type="checkbox" defaultChecked={isSupervisor} disabled={pending} onChange={(e) => run(() => setPersonRoles(employeeId, { isSupervisor: e.target.checked }))} /> Supervisor</label>
      <label className="flex items-center gap-1.5 text-xs text-ink-700"><input type="checkbox" defaultChecked={isSafetyLead} disabled={pending} onChange={(e) => run(() => setPersonRoles(employeeId, { isSafetyLead: e.target.checked }))} /> Safety lead</label>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
