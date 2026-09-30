"use client";

import Link from "next/link";
import { CheckCircle2, Siren } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createReport } from "@/lib/actions/safetyReports";
import { aiStructureReport } from "@/lib/actions/safetyAi";
import type { ReportDraft } from "@/lib/safety/ai";
import { PhotoField } from "./PhotoField";
import { DraftLabel } from "./ui";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";

type Option = { key: string; label: string; plain?: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const PRIVACY_OPTIONS = [
  {
    key: "NAMED",
    label: "Share my name with my supervisor and the safety team",
    hint: "They can follow up with you. You'll see updates under My reports.",
    details: ["Your name is saved with the report. Your supervisor and the safety team can see it, along with what you wrote.", "They can ask you questions directly."],
  },
  {
    key: "CONFIDENTIAL",
    label: "Share my name with the safety team only",
    hint: "Your supervisor will not see your name. You'll see updates under My reports.",
    details: [
      "Company admins and safety leads can see your name. Your supervisor sees “Withheld”.",
      "What you write, and the site and time, are still visible to the people who handle the report. Leave out anything you would rather not share.",
    ],
  },
  {
    key: "ANONYMOUS",
    label: "Submit without my name",
    hint: "Your name and account are not saved with the report. You get a private case code to read replies.",
    details: [
      "Reldro does not link the report to your account, and the activity log does not record who submitted it.",
      "What you write, your photos, and details like the site and time could still point to you, especially at a small site. Leave out anything you do not want traced.",
      "You get a case code once, right after you submit. Keep it private. It cannot be recovered, and without it you cannot read replies or answer questions.",
    ],
  },
] as const;

function localInputValue(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function ReportForm({
  types,
  categories,
  sites,
  defaultSiteId,
  emergencyText,
  siteLabel = "site",
}: {
  types: Option[];
  categories: Option[];
  sites: { id: string; name: string }[];
  defaultSiteId: string | null;
  /** The company's own emergency instructions. Empty means the standard message only. */
  emergencyText: string;
  siteLabel?: string;
}) {
  const [state, formAction, submitting] = useActionState(createReport, undefined);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [transcript, setTranscript] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [title, setTitle] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [injury, setInjury] = useState(false);
  const [when, setWhen] = useState<"now" | "earlier">("now");
  const [whenValue, setWhenValue] = useState("");
  const [siteChoice, setSiteChoice] = useState(defaultSiteId ?? "");
  const [copied, setCopied] = useState(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const [privacy, setPrivacy] = useState("NAMED");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const doneRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (state?.error) errorRef.current?.focus();
    if (state?.submitted) {
      // The form was scrolled down when it was sent; bring the confirmation (and the one-time code) into view.
      doneRef.current?.scrollIntoView({ block: "start" });
      doneRef.current?.focus({ preventScroll: true });
    }
  }, [state]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += e.results[i][0].transcript + " ";
      if (said.trim()) {
        setDescription((d) => (d ? d.trimEnd() + " " : "") + said.trim());
        setTranscript((t) => (t ? t + " " : "") + said.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function askAi() {
    setAiError(null);
    startDrafting(async () => {
      try {
        setDraft(await aiStructureReport(description));
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "Couldn't draft that.");
      }
    });
  }

  function applyDraft() {
    if (!draft) return;
    setType(draft.type);
    setCategory(draft.category);
    setTitle(draft.title);
    setDescription(draft.description);
    setImmediateAction(draft.immediateAction);
    setInjury(draft.injuryInvolved);
    setAiAssisted(true);
    setDraft(null);
  }

  const occurredAt = when === "earlier" && whenValue ? new Date(whenValue).toISOString() : "";
  const nowLocal = localInputValue(new Date());
  const chip = (checked: boolean) =>
    `flex min-h-[3.25rem] cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${checked ? "border-brand-700 bg-orchid-soft" : "border-ink-200 bg-white hover:bg-ink-50"}`;
  const privacyInfo = PRIVACY_OPTIONS.find((o) => o.key === privacy) ?? PRIVACY_OPTIONS[0];

  if (state?.submitted) {
    const { number, followUpCode } = state.submitted;
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="space-y-5 rounded-2xl border border-ink-200 bg-white p-5 text-center outline-none sm:p-8">
        <CheckCircle2 size={44} className="mx-auto text-sage-deep" aria-hidden />
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Your anonymous report was submitted</h2>
          <p className="mt-1 text-sm text-ink-500">Reference SR-{String(number).padStart(4, "0")}</p>
        </div>
        <div className="rounded-xl border-2 border-dashed border-brand-700 bg-orchid-soft/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-600">Your private case code</p>
          <p className="mt-1 select-all font-mono text-2xl font-semibold tracking-wider text-ink-900">{followUpCode}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(followUpCode).then(() => setCopied(true)).catch(() => undefined)}
            className="mt-2 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <p className="text-sm text-ink-700">
          Write this down or save it somewhere private. <strong>It is shown only once and cannot be recovered.</strong> Use it on{" "}
          <Link href="/follow-up" className="font-medium text-orchid-deep underline">the follow-up page</Link> to read replies and answer questions without sharing your name.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard/reports/new" className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800">Report another</Link>
          <Link href="/dashboard/overview" className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50">Back to home</Link>
        </div>
        <p className="text-xs text-ink-500">Submitting this report did not call anyone. If someone still needs help, call your local emergency number now.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6 pb-32 sm:pb-0" noValidate={false}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="transcript" value={transcript} />
      <input type="hidden" name="occurredAt" value={occurredAt} />
      <input type="hidden" name="whenMode" value={when} />
      <input type="hidden" name="aiAssisted" value={aiAssisted ? "1" : "0"} />

      <div role="note" className="flex gap-3 rounded-xl border border-coral bg-coral-soft px-4 py-3 text-sm text-ink-900">
        <Siren size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="font-semibold">If anyone is in immediate danger or needs urgent medical help, call your local emergency number or follow your site's emergency procedure now.</p>
          {emergencyText && <p className="mt-1 text-ink-800">Your company's instructions: {emergencyText}</p>}
          <p className="mt-1 text-xs text-ink-700">Do not wait to submit this report. Submitting a report does not call emergency services or send anyone to help.</p>
        </div>
      </div>

      {state?.error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger outline-none">
          {state.error}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">What are you reporting?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {types.map((t) => (
            <label key={t.key} className={chip(type === t.key)}>
              <input type="radio" name="_type" className="sr-only" checked={type === t.key} onChange={() => { setType(t.key); if (t.key === "INJURY") setInjury(true); }} />
              <span className="text-sm font-medium text-ink-900">{t.label}</span>
              {t.plain && <span className="text-[11px] leading-tight text-ink-500">{t.plain}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <section aria-labelledby="what-happened">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="description" id="what-happened" className="text-sm font-semibold text-ink-900">
            Describe what happened
          </label>
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${listening ? "border-danger bg-coral-soft text-danger" : "border-ink-300 text-ink-700 hover:bg-ink-50"}`}
            >
              {listening ? "● Listening. Tap to stop" : "🎤 Use voice input"}
            </button>
          )}
        </div>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
          minLength={5}
          placeholder="Include what you saw, where it happened, and when, if you know."
          className="mt-2 text-base"
        />
        <p className="mt-1 text-[11px] text-ink-500" aria-live="polite">
          {voiceSupported
            ? listening
              ? "Listening. Your words appear above as a draft. Tap to stop, then review and edit the text."
              : "Voice input types your words above as a draft. Review and edit it before you submit. Nothing is submitted until you choose Submit report."
            : "Tip: use the microphone on your keyboard to dictate. Review and edit the text before you submit."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={drafting || description.trim().length < 5}
            onClick={askAi}
            className="rounded-full border border-orchid-deep px-3 py-1.5 text-xs font-medium text-orchid-deep hover:bg-orchid-soft disabled:opacity-40"
          >
            {drafting ? "Drafting…" : "Draft details with AI"}
          </button>
          <span className="text-[11px] text-ink-500">Review and edit the draft before submitting it. AI tidies what you wrote and does not add facts.</span>
        </div>
        {aiError && <p role="alert" className="mt-1 text-xs text-danger">{aiError}</p>}
        {draft && (
          <div className="mt-3 space-y-2 rounded-xl border border-orchid bg-orchid-soft/40 p-3 text-sm">
            <DraftLabel generatedBy={draft.generatedBy} />
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-ink-800">
              <dt className="text-ink-500">Kind</dt><dd>{types.find((t) => t.key === draft.type)?.label}</dd>
              <dt className="text-ink-500">Topic</dt><dd>{categories.find((c) => c.key === draft.category)?.label}</dd>
              <dt className="text-ink-500">Title</dt><dd>{draft.title}</dd>
            </dl>
            <p className="text-[11px] text-ink-500">Based only on what you wrote above. The safety team decides how serious it is.</p>
            {draft.missing.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-700">Details that would help, if you know them:</p>
                <ul className="list-disc pl-5 text-xs text-ink-700">{draft.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={applyDraft} className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800">Use this draft</button>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700">Discard</button>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Field label="Where did it happen?" hint={`Choose the closest ${siteLabel}. “Not sure” is fine and will not stop you submitting.`}>
            <Select name="siteId" value={siteChoice} onChange={(e) => setSiteChoice(e.target.value)} className="text-base">
              <option value="">Not sure</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__else">Somewhere else</option>
            </Select>
          </Field>
          <Field label={siteChoice === "__else" || siteChoice === "" ? "Describe the location" : "Where exactly?"} optional>
            <Input name="locationNote" maxLength={300} placeholder={siteChoice === "__else" || siteChoice === "" ? "e.g. Customer's parking lot, 5th & Main" : "e.g. Level 3, east stair"} />
          </Field>
        </div>
        <fieldset>
          <legend className="text-xs font-medium text-ink-700">When did it happen?</legend>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              aria-pressed={when === "now"}
              onClick={() => setWhen("now")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${when === "now" ? "border-brand-700 bg-orchid-soft" : "border-ink-200"}`}
            >
              Just now
            </button>
            <button
              type="button"
              aria-pressed={when === "earlier"}
              onClick={() => { setWhen("earlier"); if (!whenValue) setWhenValue(localInputValue(new Date(Date.now() - 3600_000))); }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${when === "earlier" ? "border-brand-700 bg-orchid-soft" : "border-ink-200"}`}
            >
              Earlier
            </button>
          </div>
          {when === "earlier" && (
            <div className="mt-2">
              <label htmlFor="whenValue" className="sr-only">Date and time it happened</label>
              <Input id="whenValue" type="datetime-local" value={whenValue} max={nowLocal} onChange={(e) => setWhenValue(e.target.value)} required />
              <p className="mt-1 text-[11px] text-ink-500">Add the date and approximate time, if known.</p>
            </div>
          )}
        </fieldset>
      </section>

      <section className="space-y-2">
        <label className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3">
          <input type="checkbox" name="injuryInvolved" checked={injury} onChange={(e) => setInjury(e.target.checked)} className="mt-1 h-5 w-5 rounded border-ink-300" />
          <span>
            <span className="text-sm font-medium text-ink-900">Someone was injured or became ill</span>
            <span className="block text-xs text-ink-500">Leave out medical details and the names of injured people unless you need them. The safety team will ask for what they need.</span>
          </span>
        </label>
        <div>
          <p className="mb-1 text-sm font-semibold text-ink-900">Photos <span className="text-xs font-normal text-ink-400">optional</span></p>
          <PhotoField />
        </div>
      </section>

      <details className="rounded-xl border border-ink-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-800">More details (optional)</summary>
        <div className="mt-3 space-y-4">
          <Field label="Topic" hint="Your best guess is fine. The safety team can change it.">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="What was done right away?" optional>
            <Textarea name="immediateAction" value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={2} placeholder="e.g. Area blocked off, tool tagged out" />
          </Field>
        </div>
      </details>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-900">Who can see your name?</legend>
        {PRIVACY_OPTIONS.map((p) => (
          <label key={p.key} className={chip(privacy === p.key)}>
            <input type="radio" name="privacy" value={p.key} className="sr-only" checked={privacy === p.key} onChange={() => setPrivacy(p.key)} />
            <span className="text-sm font-medium text-ink-900">{p.label}</span>
            <span className="text-[11px] text-ink-500">{p.hint}</span>
          </label>
        ))}
        <div className="rounded-lg bg-surface-sunken px-3 py-2 text-xs text-ink-700" aria-live="polite">
          <p className="font-medium text-ink-800">What this means</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {privacyInfo.details.map((d) => <li key={d}>{d}</li>)}
            <li>Photos are shrunk in your browser and location data in them is dropped before sending.</li>
          </ul>
        </div>
      </fieldset>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ink-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
        <button
          type="submit"
          disabled={submitting || !type || description.trim().length < 5 || (when === "earlier" && !whenValue)}
          className="w-full rounded-full bg-brand-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-40 sm:w-auto"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
        {!type && <p className="mt-1 text-center text-[11px] text-ink-500 sm:text-left">Choose what you are reporting to continue.</p>}
      </div>
    </form>
  );
}
