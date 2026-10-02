"use client";

import { useState, useTransition } from "react";
import { lookupFollowUp, sendFollowUpReply, type FollowUpView } from "@/lib/actions/safetyFollowUp";
import { Field, Textarea } from "@/components/ui/Field";
import { authButtonIdle, authButtonLg, authCard, authHint, authInput, authLabel } from "@/components/auth/styles";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function FollowUpClient() {
  const [code, setCode] = useState("");
  const [view, setView] = useState<FollowUpView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();

  function look(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await lookupFollowUp(code);
      if (r.ok) setView(r.view);
      else setError(r.error);
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await sendFollowUpReply(code, reply);
      if (r.ok) {
        setView(r.view);
        setReply("");
      } else setError(r.error);
    });
  }

  if (!view) {
    const ready = code.replace(/[^a-z0-9]/gi, "").length >= 12;
    return (
      <form onSubmit={look} className={`${authCard} p-6 sm:p-9`}>
        {error && <Alert tone="error" className="mb-6">{error}</Alert>}
        <label htmlFor="case-code" className={authLabel}>Case code</label>
        <input
          id="case-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          required
          aria-describedby="case-code-hint"
          aria-invalid={error ? true : undefined}
          className={`${authInput} type-code mt-2 !text-base uppercase`}
        />
        <p id="case-code-hint" className={`${authHint} mt-2.5`}>For example, K7QF-3MXP-9WDA. It was shown once, right after you submitted the report.</p>
        <button disabled={pending || !ready} className={`${authButtonLg} mt-8 ${!ready && !pending ? authButtonIdle : ""}`}>
          {pending ? <><Spinner /> Checking…</> : "Check for updates"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${authCard} p-5`}>
        <p className="tabular-nums text-xs text-ink-400">{view.reference}</p>
        <p className="mt-1 text-lg font-semibold text-ink-900">{view.status}</p>
        <p className="text-xs text-ink-500">Sent {fmt(view.submittedAt)}</p>
      </div>

      <ol className={`space-y-3 ${authCard} p-5`} aria-label="Updates on your report">
        {view.steps.map((s, i) => (
          <li key={i} className="text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{s.from === "you" ? "You" : s.from === "team" ? "Safety team" : "Update"} · {fmt(s.at)}</p>
            <p className={`mt-0.5 whitespace-pre-wrap ${s.from === "team" ? "rounded-lg bg-orchid-soft/50 px-3 py-2 text-ink-900" : "text-ink-800"}`}>{s.text}</p>
          </li>
        ))}
      </ol>

      {!view.closed ? (
        <form onSubmit={send} className={`space-y-3 ${authCard} p-5`}>
          {error && <Alert tone="error">{error}</Alert>}
          <Field label="Reply to the safety team" hint="Share only what you are comfortable sharing. Names or places could reveal who you are.">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={2000} />
          </Field>
          <button disabled={pending || reply.trim().length < 2} className="h-10 rounded-[10px] bg-brand-700 px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-800 active:bg-oxblood disabled:cursor-not-allowed disabled:!bg-ink-100 disabled:!text-ink-400">
            {pending ? <><Spinner /> Sending…</> : "Send reply"}
          </button>
        </form>
      ) : (
        <p className="rounded-lg bg-sage px-4 py-3 text-sm text-sage-deep">This report is closed. If something else comes up, you can submit a new report.</p>
      )}
      <button onClick={() => { setView(null); setCode(""); }} className="text-xs font-medium text-ink-500 hover:text-ink-800">Look up a different code</button>
    </div>
  );
}
