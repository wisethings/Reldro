"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { saveInvestigation, noteAiDraftUsed, setInvestigationStatus } from "@/lib/actions/safetyInvestigations";
import { aiDraftLesson, aiSummarizeInvestigation } from "@/lib/actions/safetyAi";
import { Field, Textarea } from "@/components/ui/Field";
import { AiTextDraft } from "./AiTextDraft";
import { useAct } from "./useAct";
import { Alert } from "@/components/ui/Alert";

export function InvestigationForm({
  investigationId,
  reportId,
  initial,
  factors,
  status,
  isSafetyTeam,
}: {
  investigationId: string;
  reportId: string;
  initial: { facts: string; sequenceNotes: string; factors: string[]; rootCauseNotes: string; lessonText: string; shareLesson: boolean };
  factors: string[];
  status: string;
  isSafetyTeam: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveInvestigation, undefined);
  const [sequence, setSequence] = useState(initial.sequenceNotes);
  const [lesson, setLesson] = useState(initial.lessonText);
  const { run, pending: statusPending, error } = useAct();
  const locked = status === "COMPLETE" && !isSafetyTeam;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="investigationId" value={investigationId} />
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.success && <p role="status" className="flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep"><Check size={15} aria-hidden /> {state.success}</p>}

        <Field label="Facts gathered" hint="What is known: observations, measurements, and conditions. Include only what can be verified.">
          <Textarea name="facts" defaultValue={initial.facts} rows={5} disabled={locked} placeholder="e.g. The corridor was mopped at 7:30. The ladder is a 6 ft fiberglass stepladder with worn rubber feet. No wet-floor sign was up." className="leading-relaxed" />
        </Field>

        <Field label="Sequence of events" hint="In order: what happened before, during, and after.">
          <Textarea name="sequenceNotes" value={sequence} onChange={(e) => setSequence(e.target.value)} rows={5} disabled={locked} placeholder="e.g. 7:30 cleaning finished. 8:10 the electrician set up the ladder near the door frame. 8:15 the feet slid." className="leading-relaxed" />
        </Field>
        <AiTextDraft
          label="Draft a summary from the timeline"
          generate={() => aiSummarizeInvestigation(reportId)}
          useLabel="Add this draft to the sequence"
          onUse={async (text) => {
            setSequence((s) => (s ? s.trimEnd() + "\n\n" : "") + text);
            await noteAiDraftUsed(investigationId, "timeline summary");
          }}
          disabled={locked}
        />

        <FactorChips factors={factors} initial={initial.factors} locked={locked} />

        <Field label="Root-cause reasoning" hint="Written by the investigator. Reldro does not suggest or fill in a root cause.">
          <Textarea name="rootCauseNotes" defaultValue={initial.rootCauseNotes} rows={4} disabled={locked} placeholder="Explain why the conditions existed, not who was at fault. e.g. No one owned the check for wet floors, and the daily plan did not mention cleaning." className="leading-relaxed" />
        </Field>

        <div className="space-y-2 border-t border-ink-100 pt-5">
          <Field label="Lesson to share with crews" hint="Leave out names, injury details, and other personal details. Only the safety team can publish a lesson." optional>
            <Textarea name="lessonText" value={lesson} onChange={(e) => setLesson(e.target.value)} rows={3} disabled={locked} placeholder="One or two sentences a crew can act on tomorrow." />
          </Field>
          {isSafetyTeam && !locked && (
            <AiTextDraft label="Draft a lesson without personal details" generate={() => aiDraftLesson(reportId)} useLabel="Use this draft" onUse={(t) => setLesson(t)} />
          )}
          {isSafetyTeam && (
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="shareLesson" defaultChecked={initial.shareLesson} /> Share this lesson with everyone in the company
            </label>
          )}
        </div>

        {!locked && (
          <button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:bg-brand-800 active:scale-[0.98] disabled:opacity-50">
            {pending ? "Saving…" : "Save investigation"}
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4">
        {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
        {status === "OPEN" && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "IN_REVIEW"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">
            Send for review
          </button>
        )}
        {status !== "COMPLETE" && isSafetyTeam && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "COMPLETE"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">
            Mark complete
          </button>
        )}
        {status !== "OPEN" && isSafetyTeam && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "OPEN"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-surface-hover">
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Contributing factors as selectable tiles. The tile you pick fills with a soft tint and a tick, so the factors that
 * played a part are visible at a glance. Still ordinary checkboxes underneath, so keyboards and screen readers work.
 */
function FactorChips({ factors, initial, locked }: { factors: string[]; initial: string[]; locked: boolean }) {
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  return (
    <fieldset>
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-xs font-medium text-ink-700">Contributing factors</legend>
        <span className="text-xs tabular-nums text-ink-500" aria-live="polite">{picked.size === 0 ? "None selected" : `${picked.size} selected`}</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-500">Select everything that played a part. Focus on the conditions around the work, not on who to blame.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {factors.map((f) => {
          const on = picked.has(f);
          return (
            <label key={f} className={`relative flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all focus-within:ring-2 focus-within:ring-brand-500 active:scale-[0.99] ${on ? "border-brand-700 bg-orchid-soft/70 text-ink-900" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-surface-hover"} ${locked ? "cursor-not-allowed opacity-70" : ""}`}>
              <input type="checkbox" name="factor" value={f} checked={on} disabled={locked} className="sr-only" onChange={(e) => setPicked((prev) => { const n = new Set(prev); e.target.checked ? n.add(f) : n.delete(f); return n; })} />
              <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-brand-700 bg-brand-700 text-white" : "border-ink-300 bg-white"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
              <span className="leading-snug">{f}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
