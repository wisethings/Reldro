"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Lightbulb, BarChart3 } from "lucide-react";
import { LIKERT_LABELS, likertToScore } from "@/lib/data/assessment-questions";
import { IconBadge, type IconBadgeTone } from "@/components/ui/IconBadge";
import { ProgressBar } from "@/components/ui/Progress";

const RATING_MEANING = [
  "Not at all true",
  "Slightly true",
  "Somewhat true",
  "Mostly true",
  "Very true",
];

export function LikertAssessmentForm<TCategory extends string>({
  questions,
  categoryIcon,
  categoryLabel,
  subjectLabel,
  measuresDescription,
  onSubmit,
  submitLabel = "See my results",
  pending,
}: {
  questions: { key: string; category: TCategory; text: string }[];
  categoryIcon: Record<TCategory, { icon: ComponentType<{ size?: number }>; tone: IconBadgeTone }>;
  categoryLabel: Record<TCategory, string>;
  /** How the rating guide should phrase the subject - "our organization" or "me". */
  subjectLabel: string;
  measuresDescription: string;
  onSubmit: (responses: { key: string; score: number }[]) => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const answeredCount = useMemo(() => questions.filter((q) => answers[q.key] !== undefined).length, [answers, questions]);
  const complete = answeredCount === questions.length;
  const pct = Math.round((answeredCount / questions.length) * 100);
  const categories = useMemo(() => Array.from(new Set(questions.map((q) => q.category))), [questions]);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>
            Step {Math.min(answeredCount + 1, questions.length)} of {questions.length}
          </span>
          <span>{pct}% complete</span>
        </div>
        <ProgressBar value={pct} />

        <div className="space-y-5">
          {questions.map((q) => {
            const { icon: Icon, tone } = categoryIcon[q.category];
            return (
              <div key={q.key} className="rounded-xl border border-ink-200 p-4">
                <div className="flex items-start gap-3">
                  <IconBadge icon={<Icon size={18} />} tone={tone} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{categoryLabel[q.category]}</p>
                    <p className="mt-0.5 text-sm text-ink-900">{q.text}</p>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {LIKERT_LABELS.map((label, idx) => {
                        const value = idx + 1;
                        const active = answers[q.key] === value;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
                            className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2.5 text-center ${
                              active ? "border-orchid-deep bg-orchid-soft text-orchid-deep" : "border-ink-200 text-ink-500 hover:border-ink-300"
                            }`}
                          >
                            <span className="text-sm font-semibold">{value}</span>
                            <span className="text-[10px] leading-tight">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onSubmit(questions.map((q) => ({ key: q.key, score: likertToScore(answers[q.key] ?? 1) })))}
          disabled={!complete || pending}
          className="w-full rounded-full bg-ink-900 px-4 py-3 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-40"
        >
          {pending ? "Saving…" : `${submitLabel} →`}
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <IconBadge icon={<Lightbulb size={16} />} tone="olive" className="h-8 w-8" />
            <p className="text-sm font-semibold text-ink-900">What does this measure?</p>
          </div>
          <p className="mt-2 text-xs text-ink-600">{measuresDescription}</p>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <IconBadge icon={<BarChart3 size={16} />} tone="orchid" className="h-8 w-8" />
            <p className="text-sm font-semibold text-ink-900">Rating guide</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {LIKERT_LABELS.map((label, idx) => (
              <div key={label} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-semibold text-ink-700">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-ink-900">{label}</p>
                  <p className="text-[11px] text-ink-500">
                    {RATING_MEANING[idx]} for {subjectLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">Dimensions covered</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <span key={cat} className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-700">
                {categoryLabel[cat]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
