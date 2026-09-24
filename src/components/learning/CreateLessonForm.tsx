"use client";

import { useActionState, useState } from "react";
import { createCustomLesson } from "@/lib/actions/customLearning";

const LESSON_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "CONCEPT", label: "Concept" },
  { value: "DEMONSTRATION", label: "Demonstration" },
  { value: "INTERACTIVE_EXERCISE", label: "Interactive exercise" },
  { value: "TOOL_PRACTICE", label: "Tool practice" },
  { value: "PROMPT_EXERCISE", label: "Prompt exercise" },
  { value: "DECISION_EXERCISE", label: "Decision exercise" },
  { value: "KNOWLEDGE_CHECK", label: "Knowledge check" },
  { value: "REFLECTION", label: "Reflection" },
  { value: "WORKFLOW_PRACTICE", label: "Workflow practice" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">{label}</label>
      {hint && <p className="text-[11px] text-ink-400">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export function CreateLessonForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createCustomLesson, undefined);
  const [hasKnowledgeCheck, setHasKnowledgeCheck] = useState(false);
  const [optionCount, setOptionCount] = useState(2);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lesson title">
          <input name="title" required placeholder="e.g. Drafting a claims summary" className={inputClass} />
        </Field>
        <Field label="Type">
          <select name="type" defaultValue="CONCEPT" className={`${inputClass} bg-white`}>
            {LESSON_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Objective" hint="What you'll be able to do">
          <input name="objective" placeholder="Optional" className={inputClass} />
        </Field>
        <Field label="Duration (minutes)">
          <input name="durationMin" type="number" min={1} defaultValue={8} className={inputClass} />
        </Field>
      </div>

      <Field label="Why it matters" hint="Connect this to your team's actual work">
        <textarea name="whyItMatters" rows={2} placeholder="Optional" className={inputClass} />
      </Field>

      <Field label="Learn" hint="Short, practical explanation of the skill">
        <textarea name="concept" required rows={3} className={inputClass} />
      </Field>

      <Field label="See it" hint="A worked example, showing an expert doing this well">
        <textarea name="example" required rows={3} className={inputClass} />
      </Field>

      <Field label="Try it" hint="Instructions for the employee to attempt the task themselves">
        <textarea name="tryItPrompt" rows={2} placeholder="Optional" className={inputClass} />
      </Field>

      <Field label="Evaluate" hint="An AI output or decision for the employee to assess">
        <textarea name="evaluatePrompt" rows={2} placeholder="Optional" className={inputClass} />
      </Field>

      <Field label="Apply" hint="Connect the skill to a real task on your team">
        <textarea name="exercise" required rows={3} className={inputClass} />
      </Field>

      <Field label="Takeaway" hint="One concise principle to remember">
        <input name="takeaway" placeholder="Optional" className={inputClass} />
      </Field>

      <div className="rounded-lg border border-ink-200 p-3">
        <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <input type="checkbox" checked={hasKnowledgeCheck} onChange={(e) => setHasKnowledgeCheck(e.target.checked)} />
          Add a knowledge-check question
        </label>
        {hasKnowledgeCheck && (
          <div className="mt-3 space-y-3">
            <Field label="Question">
              <input name="knowledgeCheckQuestion" placeholder="What should you always do before...?" className={inputClass} />
            </Field>
            {Array.from({ length: optionCount }).map((_, i) => (
              <Field key={i} label={`Option ${i + 1}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="kcCorrectIndex" value={i} defaultChecked={i === 0} title="Correct answer" />
                  <input name={`kcOption${i}`} required className={inputClass} />
                </div>
              </Field>
            ))}
            {optionCount < 4 && (
              <button
                type="button"
                onClick={() => setOptionCount((n) => Math.min(4, n + 1))}
                className="text-xs font-medium text-orchid-deep hover:text-oxblood"
              >
                + Add another option
              </button>
            )}
            <p className="text-[11px] text-ink-400">Select the radio button next to the correct answer.</p>
          </div>
        )}
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-sage-deep">{state.success}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add lesson"}
      </button>
    </form>
  );
}
