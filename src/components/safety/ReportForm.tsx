"use client";

import Link from "next/link";
import { CheckCircle2, Mic, Siren } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createReport } from "@/lib/actions/safetyReports";
import { aiStructureReport } from "@/lib/actions/safetyAi";
import type { ReportDraft } from "@/lib/safety/ai";
import { PhotoField } from "./PhotoField";
import { DraftLabel } from "./ui";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";

type Option = { key: string; label: string; plain?: string };

type SpeechResultLike = { isFinal: boolean; 0: { transcript: string }; length: number };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<SpeechResultLike> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

function speechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "service-not-allowed": "Voice input is turned off on this device. Turn on dictation in your device settings, then try again.",
  "no-speech": "No speech was heard. Try again and speak close to the microphone.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice input needs an internet connection. Check your connection and try again.",
  "language-not-supported": "Voice input does not support your device language. Use your keyboard's microphone instead.",
};

const PRIVACY_OPTIONS = [
  {
    key: "NAMED",
    label: "Share my name with my supervisor and the safety team",
    short: "They can follow up with you.",
    hint: "They can follow up with you. You'll see updates under My reports.",
    details: ["Your name is saved with the report. Your supervisor and the safety team can see it, along with what you wrote.", "They can ask you questions directly."],
  },
  {
    key: "CONFIDENTIAL",
    label: "Share my name with the safety team only",
    short: "Your supervisor will not see your name.",
    hint: "Your supervisor will not see your name. You'll see updates under My reports.",
    details: [
      "Company admins and safety leads can see your name. Your supervisor sees “Withheld”.",
      "What you write, and the site and time, are still visible to the people who handle the report. Leave out anything you would rather not share.",
    ],
  },
  {
    key: "ANONYMOUS",
    label: "Submit without my name",
    short: "Your name and account are not saved with the report.",
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
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceBase = useRef("");
  const voiceHeard = useRef("");

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
    setVoiceSupported(Boolean(speechCtor()) && window.isSecureContext);
    return () => recRef.current?.abort();
  }, []);

  function toggleVoice() {
    setVoiceError(null);
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor || !window.isSecureContext) {
      setVoiceSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    // One phrase at a time is the most dependable mode on phones; tap again to add more.
    rec.continuous = false;
    voiceBase.current = description;
    voiceHeard.current = "";
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      // Rebuild from everything heard in this session so partial results are replaced, never repeated.
      let heard = "";
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      heard = heard.trim();
      voiceHeard.current = heard;
      const base = voiceBase.current.trimEnd();
      setDescription(base ? `${base} ${heard}` : heard);
    };
    rec.onerror = (e) => {
      setListening(false);
      setVoiceError(VOICE_ERRORS[e.error ?? ""] ?? "Voice input stopped. Try again, or use your keyboard's microphone.");
    };
    rec.onend = () => {
      setListening(false);
      if (voiceHeard.current) setTranscript((t) => (t ? `${t} ` : "") + voiceHeard.current);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setVoiceError("Voice input could not start. Try again, or use your keyboard's microphone.");
    }
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

  const problem = !type
    ? "Choose what you are reporting to continue."
    : description.trim().length < 5
      ? "Describe what happened to continue."
      : when === "earlier" && !whenValue
        ? "Add when it happened to continue."
        : "";
  const canSubmit = !problem && !submitting;
  const stepDone = [Boolean(type) && description.trim().length >= 5, !(when === "earlier" && !whenValue), true, canSubmit];
  const steps = [
    { id: "what", label: "What happened" },
    { id: "where", label: "Where & when" },
    { id: "more", label: "More details" },
    { id: "submit", label: "Submit" },
  ];
  const tile = (checked: boolean) =>
    `relative flex cursor-pointer select-none flex-col justify-center rounded-lg border px-3.5 py-2.5 text-left transition-all focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 active:scale-[0.99] ${checked ? "border-brand-700 bg-orchid-soft/70" : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"}`;

  return (
    <form action={formAction} className="space-y-9 pb-32 sm:pb-0" noValidate={false}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="transcript" value={transcript} />
      <input type="hidden" name="occurredAt" value={occurredAt} />
      <input type="hidden" name="whenMode" value={when} />
      <input type="hidden" name="aiAssisted" value={aiAssisted ? "1" : "0"} />

      <ol aria-label="Steps" className="-mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-ink-500">
        {steps.map((st, i) => (
          <li key={st.id} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="mx-1 text-ink-300">→</span>}
            <a href={`#${st.id}`} className={`flex items-center gap-1.5 rounded px-1 py-0.5 hover:text-ink-900 ${stepDone[i] && i !== 2 ? "text-ink-700" : ""}`}>
              <span aria-hidden className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${stepDone[i] && i !== 2 ? "bg-sage-deep text-white" : "bg-ink-100 text-ink-500"}`}>{stepDone[i] && i !== 2 ? "✓" : i + 1}</span>
              {st.label}
            </a>
          </li>
        ))}
      </ol>

      <div role="note" className="flex gap-3 rounded-lg border-l-4 border-danger bg-coral-soft/60 px-4 py-3 text-sm text-ink-900">
        <Siren size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="font-semibold">If anyone is in immediate danger or needs urgent medical help, call your local emergency number or follow your site's emergency procedure now.</p>
          {emergencyText && <p className="mt-1 text-ink-800">Your company's instructions: {emergencyText}</p>}
          <p className="mt-1 text-xs text-ink-700">Do not wait to submit this report. Submitting a report does not call emergency services or send anyone to help.</p>
        </div>
      </div>

      {state?.error && (
        <div ref={errorRef} tabIndex={-1} className="outline-none">
          <Alert tone="error">{state.error}</Alert>
        </div>
      )}

      <section id="what" className="scroll-mt-20 space-y-5">
        <fieldset>
          <legend className="text-base font-semibold text-ink-900">What are you reporting?</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {types.map((t) => (
              <label key={t.key} className={tile(type === t.key)}>
                <input type="radio" name="_type" className="sr-only" checked={type === t.key} onChange={() => { setType(t.key); if (t.key === "INJURY") setInjury(true); }} />
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-ink-900">
                  {t.label}
                  {type === t.key && <CheckCircle2 size={16} className="shrink-0 text-brand-700" aria-hidden />}
                </span>
                {t.plain && <span className="mt-0.5 text-xs leading-snug text-ink-500">{t.plain}</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <div aria-labelledby="what-happened">
          <label htmlFor="description" id="what-happened" className="text-base font-semibold text-ink-900">What happened?</label>
          <div className="relative mt-3">
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
              minLength={5}
              placeholder="Tell us in your own words: what you saw, and anything that helps someone understand it."
              className="rounded-xl p-3.5 pb-14 text-base leading-relaxed"
            />
            <button
              type="button"
              onClick={toggleVoice}
              disabled={!voiceSupported}
              aria-pressed={listening}
              title={voiceSupported ? undefined : "Voice input is not available in this browser"}
              className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${listening ? "border-danger bg-coral-soft text-danger" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"}`}
            >
              {listening ? <><span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-danger" /> Listening. Tap to stop</> : <><Mic size={13} aria-hidden /> Speak instead</>}
            </button>
          </div>
          {voiceError && <Alert tone="warning" className="mt-2 text-xs">{voiceError}</Alert>}
          <p className="mt-1.5 text-xs text-ink-500" aria-live="polite">
            {!voiceSupported
              ? "Speaking is not available in this browser. Use the microphone on your keyboard, then review the text."
              : listening
                ? "Listening. Your words appear above as a draft. Review and edit them before you submit."
                : "Speaking types your words as a draft. Review it before you submit. Nothing is sent until you choose Submit report."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              disabled={drafting || description.trim().length < 5}
              onClick={askAi}
              className="rounded-full border border-orchid-deep/60 px-3 py-1 text-xs font-medium text-orchid-deep hover:bg-orchid-soft disabled:opacity-40"
            >
              {drafting ? "Drafting…" : "Draft details with AI"}
            </button>
            <span className="text-xs text-ink-500">AI tidies what you wrote and does not add facts. You review it first.</span>
          </div>
          {aiError && <p role="alert" className="mt-1 text-xs text-danger">{aiError}</p>}
          {draft && (
            <div className="mt-3 space-y-2 rounded-lg bg-orchid-soft/50 p-3.5 text-sm">
              <DraftLabel generatedBy={draft.generatedBy} />
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-ink-800">
                <dt className="text-ink-500">Kind</dt><dd>{types.find((t) => t.key === draft.type)?.label}</dd>
                <dt className="text-ink-500">Topic</dt><dd>{categories.find((c) => c.key === draft.category)?.label}</dd>
                <dt className="text-ink-500">Title</dt><dd>{draft.title}</dd>
              </dl>
              <p className="text-xs text-ink-500">Based only on what you wrote above. The safety team decides how serious it is.</p>
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
        </div>
      </section>

      <section id="where" className="scroll-mt-20 space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Where and when?</h2>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Field label="Where did it happen?" hint={`Choose the closest ${siteLabel}. “Not sure” is fine.`}>
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
            <div className="mt-1 inline-flex w-full rounded-lg bg-ink-100 p-0.5">
              {(["now", "earlier"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={when === w}
                  onClick={() => { setWhen(w); if (w === "earlier" && !whenValue) setWhenValue(localInputValue(new Date(Date.now() - 3600_000))); }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${when === w ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.08)]" : "text-ink-600 hover:text-ink-900"}`}
                >
                  {w === "now" ? "Just now" : "Earlier"}
                </button>
              ))}
            </div>
            {when === "earlier" && (
              <div className="mt-2">
                <label htmlFor="whenValue" className="sr-only">Date and time it happened</label>
                <Input id="whenValue" type="datetime-local" value={whenValue} max={nowLocal} onChange={(e) => setWhenValue(e.target.value)} required />
                <p className="mt-1 text-xs text-ink-500">Add the date and approximate time, if known.</p>
              </div>
            )}
          </fieldset>
        </div>

        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${injury ? "border-danger/40 bg-coral-soft/50" : "border-ink-200 bg-white hover:bg-ink-50"}`}>
          <input type="checkbox" name="injuryInvolved" checked={injury} onChange={(e) => setInjury(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-ink-300 accent-[#2A0A0C]" />
          <span>
            <span className="text-sm font-medium text-ink-900">Someone was injured or became ill</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-500">Leave out medical details and names unless you need them. The safety team will ask for what they need.</span>
          </span>
        </label>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-900">Photos <span className="text-xs font-normal text-ink-500">optional</span></p>
          <PhotoField />
        </div>
      </section>

      <section id="more" className="scroll-mt-20">
        <details className="group rounded-lg border border-ink-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-sm font-medium text-ink-800 [&::-webkit-details-marker]:hidden">
            <span>Add more details <span className="font-normal text-ink-500">· topic, what was done right away</span></span>
            <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="space-y-4 border-t border-ink-100 px-3.5 py-4">
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
      </section>

      <fieldset className="space-y-2.5">
        <legend className="text-base font-semibold text-ink-900">How should we identify you?</legend>
        <div className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
          {PRIVACY_OPTIONS.map((o) => (
            <label key={o.key} className={`relative flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-brand-500 ${privacy === o.key ? "bg-orchid-soft/70" : "hover:bg-ink-50"}`}>
              <input type="radio" name="privacy" value={o.key} className="sr-only" checked={privacy === o.key} onChange={() => setPrivacy(o.key)} />
              <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${privacy === o.key ? "border-brand-700" : "border-ink-300"}`}>
                {privacy === o.key && <span className="h-2 w-2 rounded-full bg-brand-700" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink-900">{o.label}</span>
                <span className="block text-xs leading-snug text-ink-600">{o.short}</span>
              </span>
            </label>
          ))}
        </div>
        {privacy === "ANONYMOUS" && <p className="text-xs text-ink-700" aria-live="polite">You get a private case code once, right after you submit. Save it to read replies.</p>}
        <details className="group text-xs text-ink-600">
          <summary className="cursor-pointer list-none font-medium text-orchid-deep hover:text-oxblood [&::-webkit-details-marker]:hidden">
            How {privacy === "ANONYMOUS" ? "reports without a name" : "this choice"} works
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 leading-snug" aria-live="polite">
            {privacyInfo.details.map((d) => <li key={d}>{d}</li>)}
            <li>Photos are shrunk in your browser and location data in them is dropped before sending.</li>
          </ul>
        </details>
      </fieldset>

      <div id="submit" className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ink-200 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 md:bottom-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-full px-7 py-3.5 text-base font-semibold transition-colors sm:w-auto ${canSubmit ? "bg-brand-700 text-white hover:bg-brand-800" : "cursor-not-allowed bg-ink-100 text-ink-400"}`}
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
          <p className={`text-center text-xs sm:text-left ${canSubmit ? "text-sage-deep" : "text-ink-600"}`} aria-live="polite">
            {canSubmit ? "Ready to submit. You can still add more details above." : problem}
          </p>
        </div>
      </div>
    </form>
  );
}
