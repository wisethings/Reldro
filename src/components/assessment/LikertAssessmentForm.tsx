"use client";

import { useMemo, useState } from "react";
import { LIKERT_LABELS, likertToScore } from "@/lib/data/assessment-questions";

export function LikertAssessmentForm<TCategory extends string>({
  questions,
  onSubmit,
  submitLabel = "See my results",
  pending,
}: {
  questions: { key: string; category: TCategory; text: string }[];
  onSubmit: (responses: { key: string; score: number }[]) => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const complete = useMemo(() => questions.every((q) => answers[q.key] !== undefined), [answers, questions]);

  return (
    <div className="space-y-5">
      <div className="max-h-[440px] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
        {questions.map((q) => (
          <div key={q.key}>
            <p className="text-sm text-ink-800">{q.text}</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {LIKERT_LABELS.map((label, idx) => {
                const value = idx + 1;
                const active = answers[q.key] === value;
                return (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
                    className={`rounded-md border py-2 text-[11px] font-medium ${
                      active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 text-ink-500 hover:border-ink-300"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSubmit(questions.map((q) => ({ key: q.key, score: likertToScore(answers[q.key] ?? 1) })))}
        disabled={!complete || pending}
        className="w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}
