"use client";

import { useActionState, useState } from "react";
import { saveInvestigation, noteAiDraftUsed, setInvestigationStatus } from "@/lib/actions/safetyInvestigations";
import { aiDraftLesson, aiSummarizeInvestigation } from "@/lib/actions/safetyAi";
import { Field, Textarea } from "@/components/ui/Field";
import { AiTextDraft } from "./AiTextDraft";
import { useAct } from "./useAct";

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
        {state?.error && <p role="alert" className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">{state.success}</p>}

        <Field label="Facts gathered" hint="What is known: observations, measurements, conditions. Keep to what can be verified.">
          <Textarea name="facts" defaultValue={initial.facts} rows={5} disabled={locked} />
        </Field>

        <Field label="Sequence of events" hint="In order, what happened before, during and after.">
          <Textarea name="sequenceNotes" value={sequence} onChange={(e) => setSequence(e.target.value)} rows={5} disabled={locked} />
        </Field>
        <AiTextDraft
          label="Draft a summary from the timeline"
          generate={() => aiSummarizeInvestigation(reportId)}
          useLabel="Add to sequence of events"
          onUse={async (text) => {
            setSequence((s) => (s ? s.trimEnd() + "\n\n" : "") + text);
            await noteAiDraftUsed(investigationId, "timeline summary");
          }}
          disabled={locked}
        />

        <fieldset>
          <legend className="text-xs font-medium text-ink-700">Contributing factors</legend>
          <p className="mt-0.5 text-[11px] text-ink-400">Look at the system and conditions around the work, not at who to blame. Pick every factor that played a part.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {factors.map((f) => (
              <label key={f} className="flex items-start gap-2 rounded-lg border border-ink-200 bg-white p-2.5 text-sm text-ink-800">
                <input type="checkbox" name="factor" value={f} defaultChecked={initial.factors.includes(f)} disabled={locked} className="mt-0.5" />
                {f}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Root-cause reasoning" hint="Written by the investigator. Reldro never suggests or fills in a root cause.">
          <Textarea name="rootCauseNotes" defaultValue={initial.rootCauseNotes} rows={4} disabled={locked} />
        </Field>

        <div className="space-y-2 rounded-xl border border-ink-200 p-3">
          <Field label="Lesson to share with crews" hint="Write it without names, injuries or personal details. Only the safety team can publish it." optional>
            <Textarea name="lessonText" value={lesson} onChange={(e) => setLesson(e.target.value)} rows={3} disabled={locked} />
          </Field>
          {isSafetyTeam && !locked && (
            <AiTextDraft label="Draft a de-identified lesson" generate={() => aiDraftLesson(reportId)} useLabel="Use as the lesson" onUse={(t) => setLesson(t)} />
          )}
          {isSafetyTeam && (
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" name="shareLesson" defaultChecked={initial.shareLesson} /> Share this lesson company-wide
            </label>
          )}
        </div>

        {!locked && (
          <button disabled={pending} className="rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">
            {pending ? "Saving…" : "Save investigation"}
          </button>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4">
        {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
        {status === "OPEN" && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "IN_REVIEW"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50">
            Send for review
          </button>
        )}
        {status !== "COMPLETE" && isSafetyTeam && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "COMPLETE"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50">
            Mark complete
          </button>
        )}
        {status !== "OPEN" && isSafetyTeam && (
          <button disabled={statusPending} onClick={() => run(() => setInvestigationStatus(investigationId, "OPEN"))} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50">
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
