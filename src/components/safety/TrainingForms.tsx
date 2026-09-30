"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { acknowledgeTalk, addQualification, createToolboxTalk, deleteToolboxTalk } from "@/lib/actions/safetyTraining";
import { aiDraftToolboxTalk } from "@/lib/actions/safetyAi";
import { Field, Input, Select } from "@/components/ui/Field";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { btnPrimary, btnSecondary, FormPanel, FormSection } from "@/components/ui/FormParts";
import { AiTextDraft } from "./AiTextDraft";
import { useAct } from "./useAct";
import { Alert } from "@/components/ui/Alert";

/** The "New talk" entry point: a quiet header row that opens the guided form below it, and closes again. */
export function CreateTalkPanel({ sites, lockSiteId, defaultOpen = false }: { sites: { id: string; name: string }[]; lockSiteId: string | null; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!open) {
    return (
      <div className="surface flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Create toolbox talk</p>
          <p className="text-xs text-ink-500">A short safety talk your crews acknowledge. AI can draft an outline from approved material.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={`${btnPrimary} shrink-0 !px-4 !py-1.5 !text-xs`}>New talk</button>
      </div>
    );
  }
  return <TalkForm sites={sites} lockSiteId={lockSiteId} onClose={() => setOpen(false)} />;
}

export function TalkForm({ sites, lockSiteId, onClose }: { sites: { id: string; name: string }[]; lockSiteId: string | null; onClose?: () => void }) {
  const [state, formAction, pending] = useActionState(createToolboxTalk, undefined);
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [content, setContent] = useState("");
  const [aiDrafted, setAiDrafted] = useState(false);
  const [touched, setTouched] = useState<{ title?: boolean; content?: boolean }>({});
  const router = useRouter();
  useEffect(() => { if (state?.success) { setTopic(""); setSource(""); setContent(""); setAiDrafted(false); setTouched({}); router.refresh(); onClose?.(); } }, [state, router, onClose]);
  const titleError = touched.title && !topic.trim() ? "Give the talk a title." : undefined;
  const contentError = touched.content && !content.trim() ? "Add what the supervisor will cover." : undefined;

  return (
    <form action={formAction}>
      <input type="hidden" name="aiDrafted" value={aiDrafted ? "1" : "0"} />
      <FormPanel
        title="New toolbox talk"
        description="Write the talk yourself, or start from approved material and edit the AI draft."
        onClose={onClose}
        actions={
          <>
            <button disabled={pending} className={btnPrimary}>{pending ? "Publishing…" : "Publish talk"}</button>
            {onClose && <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>}
            <span className="ml-auto text-xs text-ink-500"><span className="text-danger">*</span> required</span>
          </>
        }
      >
        {state?.error && <div className="px-4 pt-4 sm:px-5"><Alert tone="error">{state.error}</Alert></div>}
        <FormSection title="Basics">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_10rem]">
            <Field label="Title" required error={titleError}><Input name="title" value={topic} onChange={(e) => setTopic(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, title: true }))} placeholder="e.g. Ladder setup and inspection" required /></Field>
            <Field label="For">
              {lockSiteId ? <Input value="Your site" disabled /> : (
                <Select name="siteId" defaultValue=""><option value="">Whole company</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              )}
            </Field>
            <Field label="Date"><Input name="scheduledFor" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
          </div>
        </FormSection>
        <FormSection title="Talk">
          <details className="group rounded-lg border border-ink-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <span>Draft from approved material with AI <span className="font-normal text-ink-500">· optional</span></span>
              <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="space-y-3 border-t border-ink-100 px-3 py-3">
              <Field label="Approved source material" optional hint="Paste a procedure, a policy excerpt, or a lesson from a past investigation. AI drafts from this text only. Review before sharing.">
                <AutoTextarea name="sourceMaterial" value={source} onChange={(e) => setSource(e.target.value)} minRows={3} maxRows={10} />
              </Field>
              <AiTextDraft
                label="Draft a talk outline with AI"
                generate={() => aiDraftToolboxTalk(topic, source)}
                useLabel="Use as the talk content"
                onUse={(text) => { setContent(text); setAiDrafted(true); }}
              />
            </div>
          </details>
          <Field label="Talk content" required error={contentError} hint="What the supervisor will cover. Use short lines and bullets.">
            <AutoTextarea name="content" value={content} onChange={(e) => setContent(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, content: true }))} minRows={5} maxRows={16} required />
          </Field>
        </FormSection>
      </FormPanel>
    </form>
  );
}

export function AcknowledgeButton({ talkId, compact = false }: { talkId: string; compact?: boolean }) {
  const { run, pending, error } = useAct();
  return (
    <div className={compact ? "text-right" : undefined}>
      <button
        disabled={pending}
        title="Confirms that you attended and understood this talk"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); run(() => acknowledgeTalk(talkId)); }}
        className={`rounded-full bg-brand-700 font-medium text-white hover:bg-brand-800 disabled:opacity-50 ${compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm"}`}
      >
        {pending ? "Saving…" : compact ? "Acknowledge" : "I attended and understood"}
      </button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DeleteTalkButton({ talkId }: { talkId: string }) {
  const { run, pending } = useAct();
  return <button disabled={pending} onClick={() => confirm("Delete this toolbox talk and its acknowledgements?") && run(() => deleteToolboxTalk(talkId))} className="text-xs text-danger hover:underline">Delete</button>;
}

/** Secondary actions for a talk, kept out of the way of the main workflow. */
export function TalkMenu({ talkId }: { talkId: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAct();
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
      <button type="button" aria-label="More actions for this talk" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-hover hover:text-ink-900">
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-44 rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-ink-200">
          <button role="menuitem" disabled={pending} onClick={() => confirm("Delete this toolbox talk and its acknowledgements?") && run(() => deleteToolboxTalk(talkId))} className="block w-full px-3 py-2 text-left text-danger hover:bg-coral-soft/50 disabled:opacity-50">Delete talk</button>
        </div>
      )}
    </div>
  );
}

export function QualificationForm({ people, suggestions }: { people: { id: string; name: string }[]; suggestions: string[] }) {
  const [state, formAction, pending] = useActionState(addQualification, undefined);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_9rem_9rem_auto]" key={state?.success ? "x" : "y"}>
      <Field label="Person"><Select name="employeeId" required defaultValue=""><option value="" disabled>Choose…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label="Qualification"><Input name="name" list="qual-suggestions" required placeholder="e.g. OSHA 30" /><datalist id="qual-suggestions">{suggestions.map((s) => <option key={s} value={s} />)}</datalist></Field>
      <Field label="Issued"><Input name="issuedOn" type="date" /></Field>
      <Field label="Expires"><Input name="expiresOn" type="date" /></Field>
      <div className="flex items-end"><button disabled={pending} className="w-full rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Record"}</button></div>
      {state?.error && <p role="alert" className="text-sm text-danger sm:col-span-2 lg:col-span-5">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep sm:col-span-2 lg:col-span-5">{state.success}</p>}
    </form>
  );
}


/** Who has not acknowledged yet: the first few names in one quiet line, with the rest a click away. */
export function StillToAcknowledge({ names, preview = 4 }: { names: string[]; preview?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? names : names.slice(0, preview);
  const rest = names.length - shown.length;
  return (
    <p className="mt-2 text-xs leading-relaxed text-ink-500">
      <span className="text-ink-500">Still to acknowledge: </span>
      <span className="text-ink-700">{shown.join(", ")}</span>
      {rest > 0 && <> <button type="button" onClick={() => setAll(true)} className="font-medium text-orchid-deep hover:text-oxblood">+{rest} more</button></>}
      {all && names.length > preview && <> <button type="button" onClick={() => setAll(false)} className="font-medium text-orchid-deep hover:text-oxblood">Show fewer</button></>}
    </p>
  );
}
