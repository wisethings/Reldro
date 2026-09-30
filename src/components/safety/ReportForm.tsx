"use client";

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

export function ReportForm({
  types,
  categories,
  severities,
  sites,
  defaultSiteId,
}: {
  types: Option[];
  categories: Option[];
  severities: Option[];
  sites: { id: string; name: string }[];
  defaultSiteId: string | null;
}) {
  const [state, formAction, submitting] = useActionState(createReport, undefined);
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [transcript, setTranscript] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [severity, setSeverity] = useState("MEDIUM");
  const [title, setTitle] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [injury, setInjury] = useState(false);
  const [when, setWhen] = useState<"now" | "earlier">("now");
  const [whenValue, setWhenValue] = useState("");
  const [privacy, setPrivacy] = useState("NAMED");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

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
    setSeverity(draft.severity);
    setTitle(draft.title);
    setDescription(draft.description);
    setImmediateAction(draft.immediateAction);
    setInjury(draft.injuryInvolved);
    setAiAssisted(true);
    setDraft(null);
  }

  const occurredAt = when === "earlier" && whenValue ? new Date(whenValue).toISOString() : "";
  const chip = (checked: boolean) =>
    `flex min-h-[3.25rem] cursor-pointer flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors ${checked ? "border-brand-700 bg-orchid-soft" : "border-ink-200 bg-white hover:bg-ink-50"}`;

  return (
    <form action={formAction} className="space-y-6 pb-24 sm:pb-0">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="severity" value={severity} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="transcript" value={transcript} />
      <input type="hidden" name="occurredAt" value={occurredAt} />
      <input type="hidden" name="aiAssisted" value={aiAssisted ? "1" : "0"} />

      {state?.error && (
        <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <section aria-labelledby="what-kind">
        <h2 id="what-kind" className="text-sm font-semibold text-ink-900">
          What are you reporting?
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {types.map((t) => (
            <label key={t.key} className={chip(type === t.key)}>
              <input type="radio" name="_type" className="sr-only" checked={type === t.key} onChange={() => { setType(t.key); if (t.key === "INJURY") setInjury(true); }} />
              <span className="text-sm font-medium text-ink-900">{t.label}</span>
              {t.plain && <span className="text-[11px] leading-tight text-ink-500">{t.plain}</span>}
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="what-happened">
        <div className="flex items-center justify-between gap-2">
          <h2 id="what-happened" className="text-sm font-semibold text-ink-900">
            What happened?
          </h2>
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={listening}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${listening ? "border-danger bg-coral-soft text-danger" : "border-ink-300 text-ink-700 hover:bg-ink-50"}`}
            >
              {listening ? "● Listening… tap to stop" : "🎤 Speak instead"}
            </button>
          )}
        </div>
        <Textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
          placeholder="In your own words. Where you were, what you were doing, what you saw."
          className="mt-2 text-base"
        />
        {!voiceSupported && <p className="mt-1 text-[11px] text-ink-400">Tip: use the microphone on your keyboard to dictate.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={drafting || description.trim().length < 5}
            onClick={askAi}
            className="rounded-full border border-orchid-deep px-3 py-1.5 text-xs font-medium text-orchid-deep hover:bg-orchid-soft disabled:opacity-40"
          >
            {drafting ? "Drafting…" : "Fill in the details for me"}
          </button>
          <span className="text-[11px] text-ink-400">Optional. You review everything before it's used.</span>
        </div>
        {aiError && <p className="mt-1 text-xs text-danger">{aiError}</p>}
        {draft && (
          <div className="mt-3 space-y-2 rounded-xl border border-orchid bg-orchid-soft/40 p-3 text-sm">
            <DraftLabel generatedBy={draft.generatedBy} />
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-ink-800">
              <dt className="text-ink-500">Kind</dt><dd>{types.find((t) => t.key === draft.type)?.label}</dd>
              <dt className="text-ink-500">Topic</dt><dd>{categories.find((c) => c.key === draft.category)?.label}</dd>
              <dt className="text-ink-500">Seriousness</dt><dd>{severities.find((s) => s.key === draft.severity)?.label} (suggested; someone will confirm)</dd>
              <dt className="text-ink-500">Title</dt><dd>{draft.title}</dd>
            </dl>
            {draft.missing.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-700">Missing details that would help:</p>
                <ul className="list-disc pl-5 text-xs text-ink-700">{draft.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={applyDraft} className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800">Use these details</button>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700">Dismiss</button>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Where" required>
          <Select name="siteId" defaultValue={defaultSiteId ?? ""} className="text-base">
            <option value="">Not sure / somewhere else</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="When">
          <div className="flex gap-2">
            <button type="button" onClick={() => setWhen("now")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${when === "now" ? "border-brand-700 bg-orchid-soft" : "border-ink-200"}`}>Just now</button>
            <button type="button" onClick={() => setWhen("earlier")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${when === "earlier" ? "border-brand-700 bg-orchid-soft" : "border-ink-200"}`}>Earlier</button>
          </div>
          {when === "earlier" && <Input type="datetime-local" value={whenValue} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setWhenValue(e.target.value)} className="mt-2" required />}
        </Field>
      </section>

      <section className="space-y-2">
        <label className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-3">
          <input type="checkbox" name="injuryInvolved" checked={injury} onChange={(e) => setInjury(e.target.checked)} className="mt-1 h-5 w-5 rounded border-ink-300" />
          <span>
            <span className="text-sm font-medium text-ink-900">Someone was hurt or felt unwell</span>
            <span className="block text-xs text-ink-500">If anyone needs medical help right now, call your emergency number first, then report.</span>
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
          <Field label="Topic" hint="Best guess is fine. The safety team will sort it out.">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="text-xs font-medium text-ink-700">How serious could it have been?</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {severities.map((s) => (
                <label key={s.key} className={chip(severity === s.key)}>
                  <input type="radio" name="_severity" className="sr-only" checked={severity === s.key} onChange={() => setSeverity(s.key)} />
                  <span className="text-sm font-medium text-ink-900">{s.label}</span>
                  <span className="text-[11px] text-ink-500">{s.plain}</span>
                </label>
              ))}
            </div>
          </div>
          <Field label="What was done right away?" optional>
            <Textarea name="immediateAction" value={immediateAction} onChange={(e) => setImmediateAction(e.target.value)} rows={2} placeholder="e.g. Area blocked off, tool tagged out" />
          </Field>
        </div>
      </details>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-900">Who can see your name?</legend>
        {[
          { key: "NAMED", label: "My supervisor and the safety team", hint: "Best for follow-up. You'll see updates." },
          { key: "CONFIDENTIAL", label: "Only the safety team", hint: "Your supervisor won't see your name. You'll still see updates." },
          { key: "ANONYMOUS", label: "No one", hint: "We won't store your name. You won't be able to see updates." },
        ].map((p) => (
          <label key={p.key} className={chip(privacy === p.key)}>
            <input type="radio" name="privacy" value={p.key} className="sr-only" checked={privacy === p.key} onChange={() => setPrivacy(p.key)} />
            <span className="text-sm font-medium text-ink-900">{p.label}</span>
            <span className="text-[11px] text-ink-500">{p.hint}</span>
          </label>
        ))}
      </fieldset>

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ink-200 bg-white p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
        <button
          type="submit"
          disabled={submitting || !type || description.trim().length < 5}
          className="w-full rounded-full bg-brand-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-40 sm:w-auto"
        >
          {submitting ? "Sending…" : "Send report"}
        </button>
        {!type && <p className="mt-1 text-center text-[11px] text-ink-500 sm:text-left">Choose what you're reporting to continue.</p>}
      </div>
    </form>
  );
}
