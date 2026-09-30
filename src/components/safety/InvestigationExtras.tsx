"use client";

import { useActionState, useState } from "react";
import { addQuestions, addStatement, answerQuestion, deleteQuestion, deleteStatement } from "@/lib/actions/safetyInvestigations";
import { aiDraftQuestions } from "@/lib/actions/safetyAi";
import type { QuestionDraft } from "@/lib/safety/ai";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { DraftLabel } from "./ui";
import { useAct } from "./useAct";

export function StatementsPanel({
  investigationId,
  statements,
}: {
  investigationId: string;
  statements: { id: string; providedBy: string; content: string; addedByName: string; createdAt: string }[];
}) {
  const [state, formAction, pending] = useActionState(addStatement, undefined);
  const { run, error } = useAct();
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-600">Statements are visible only to the safety team and the investigation lead. Use a role (for example "Journeyman electrician") if you don't need a name.</p>
      {error && <p className="text-xs text-danger">{error}</p>}
      {statements.length === 0 && <p className="text-sm text-ink-500">No statements yet.</p>}
      <ul className="space-y-3">
        {statements.map((s) => (
          <li key={s.id} className="rounded-lg bg-surface-muted p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-ink-600">{s.providedBy} · added by {s.addedByName} · {new Date(s.createdAt).toLocaleDateString()}</p>
              <button onClick={() => confirm("Remove this statement?") && run(() => deleteStatement(s.id))} className="text-xs text-danger hover:underline">Remove</button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-800">{s.content}</p>
          </li>
        ))}
      </ul>
      <form action={formAction} className="space-y-2" key={state?.success ? "reset" : "form"}>
        <input type="hidden" name="investigationId" value={investigationId} />
        <Field label="From (role or name)"><Input name="providedBy" placeholder="e.g. Apprentice electrician, witness" /></Field>
        <Field label="What they said"><Textarea name="content" rows={3} required /></Field>
        {state?.error && <p className="text-xs text-danger">{state.error}</p>}
        <button disabled={pending} className="rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-50">{pending ? "Adding…" : "Add statement"}</button>
      </form>
    </div>
  );
}

export function QuestionsPanel({
  investigationId,
  reportId,
  questions,
  canEdit,
}: {
  investigationId: string;
  reportId: string;
  questions: { id: string; text: string; answer: string; aiDrafted: boolean }[];
  canEdit: boolean;
}) {
  const { run, pending, error } = useAct();
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>(Object.fromEntries(questions.map((q) => [q.id, q.answer])));
  const [custom, setCustom] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-danger">{error}</p>}
      {questions.length === 0 && <p className="text-sm text-ink-500">No questions yet. Add your own or draft some from the report facts.</p>}
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.id} className="rounded-lg bg-surface-muted p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink-900">{q.text}{q.aiDrafted && <span className="ml-2 rounded bg-orchid-soft px-1.5 py-0.5 text-[10px] font-medium text-orchid-deep">AI-drafted, reviewed</span>}</p>
              {canEdit && <button onClick={() => run(() => deleteQuestion(q.id))} className="shrink-0 text-xs text-danger hover:underline">Remove</button>}
            </div>
            <Textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              onBlur={() => answers[q.id] !== q.answer && canEdit && run(() => answerQuestion(q.id, answers[q.id] ?? ""))}
              rows={2}
              placeholder="Answer or notes"
              className="mt-2"
              disabled={!canEdit}
            />
          </li>
        ))}
      </ul>
      {canEdit && (
        <>
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own question" />
            <button disabled={pending || !custom.trim()} onClick={() => run(() => addQuestions(investigationId, [custom], false), () => setCustom(""))} className="shrink-0 rounded-full border border-ink-300 px-4 py-1.5 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-40">Add</button>
          </div>
          <div className="space-y-2">
            <button
              disabled={drafting}
              onClick={async () => {
                setDraftError(null);
                setDrafting(true);
                try {
                  const d = await aiDraftQuestions(reportId);
                  setDraft(d);
                  setPicked(new Set(d.questions.map((_, i) => i)));
                } catch (e) {
                  setDraftError(e instanceof Error ? e.message : "Couldn't draft questions.");
                } finally {
                  setDrafting(false);
                }
              }}
              className="rounded-full border border-orchid-deep px-3 py-1.5 text-xs font-medium text-orchid-deep hover:bg-orchid-soft disabled:opacity-40"
            >
              {drafting ? "Drafting…" : "Draft investigation questions"}
            </button>
            {draftError && <p className="text-xs text-danger">{draftError}</p>}
            {draft && (
              <div className="space-y-2 rounded-xl border border-orchid bg-orchid-soft/40 p-3">
                <DraftLabel generatedBy={draft.generatedBy} />
                <p className="text-xs text-ink-600">Untick anything that doesn't fit. Questions focus on conditions and systems, not on blaming people.</p>
                {draft.questions.map((q, i) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-ink-800">
                    <input type="checkbox" className="mt-1" checked={picked.has(i)} onChange={(e) => { const n = new Set(picked); e.target.checked ? n.add(i) : n.delete(i); setPicked(n); }} />
                    {q}
                  </label>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => run(() => addQuestions(investigationId, draft.questions.filter((_, i) => picked.has(i)), true), () => setDraft(null))} disabled={pending || picked.size === 0} className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Add selected</button>
                  <button onClick={() => setDraft(null)} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700">Discard</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
