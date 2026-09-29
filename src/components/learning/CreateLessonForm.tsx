"use client";

import { useActionState, useState } from "react";
import { createCustomLesson } from "@/lib/actions/customLearning";
import { ImageAttachField } from "./ImageAttachField";
import { Field, FieldGrid, FieldSection, Input, Select, Textarea } from "@/components/ui/Field";

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

export function CreateLessonForm({ courseId }: { courseId: string }) {
  const [state, formAction, pending] = useActionState(createCustomLesson, undefined);
  const [hasKnowledgeCheck, setHasKnowledgeCheck] = useState(false);
  const [optionCount, setOptionCount] = useState(2);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      <FieldSection>
        <FieldGrid columns={2}>
          <Field label="Lesson title" required>
            <Input name="title" required placeholder="e.g. Drafting a claims summary" />
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="CONCEPT">
              {LESSON_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGrid>
        <FieldGrid columns={2}>
          <ImageAttachField name="imageUrl" label="Image" />
          <Field label="Video link" hint="YouTube, Loom, or Vimeo link to embed" optional>
            <Input name="videoUrl" type="url" placeholder="https://youtube.com/watch?v=…" />
          </Field>
        </FieldGrid>
        <FieldGrid columns={2}>
          <Field label="Objective" hint="What you'll be able to do" optional>
            <Input name="objective" />
          </Field>
          <Field label="Duration" hint="Minutes">
            <Input name="durationMin" type="number" min={1} defaultValue={8} />
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Lesson content">
        <Field label="Learn" hint="Short, practical explanation of the skill" required>
          <Textarea name="concept" required rows={3} />
        </Field>
        <Field label="See it" hint="A worked example, showing an expert doing this well" required>
          <Textarea name="example" required rows={3} />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Try it" hint="Instructions for the employee to attempt the task themselves" optional>
            <Textarea name="tryItPrompt" rows={2} />
          </Field>
          <Field label="Evaluate" hint="An AI output or decision for the employee to assess" optional>
            <Textarea name="evaluatePrompt" rows={2} />
          </Field>
        </FieldGrid>
        <Field label="Apply" hint="Connect the skill to a task on your team" required>
          <Textarea name="exercise" required rows={3} />
        </Field>
        <FieldGrid columns={2}>
          <Field label="Why it matters" hint="Connect this to your team's actual work" optional>
            <Textarea name="whyItMatters" rows={2} />
          </Field>
          <Field label="Takeaway" hint="One concise principle to remember" optional>
            <Input name="takeaway" />
          </Field>
        </FieldGrid>
      </FieldSection>

      <FieldSection title="Knowledge check">
        <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <input
            type="checkbox"
            checked={hasKnowledgeCheck}
            onChange={(e) => setHasKnowledgeCheck(e.target.checked)}
            className="rounded border-ink-300 text-brand-700 focus:ring-brand-500"
          />
          Add a knowledge-check question
        </label>
        {hasKnowledgeCheck && (
          <div className="space-y-3 rounded-lg border border-ink-200 p-3">
            <Field label="Question">
              <Input name="knowledgeCheckQuestion" placeholder="What should you always do before...?" />
            </Field>
            <FieldGrid columns={2}>
              {Array.from({ length: optionCount }).map((_, i) => (
                <Field key={i} label={`Option ${i + 1}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="kcCorrectIndex" value={i} defaultChecked={i === 0} title="Correct answer" />
                    <Input name={`kcOption${i}`} required />
                  </div>
                </Field>
              ))}
            </FieldGrid>
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
      </FieldSection>

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
