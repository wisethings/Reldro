"use client";

import { useState, useTransition } from "react";
import { checkKnowledgeAnswer, completeLesson } from "@/lib/actions/learning";

export function KnowledgeCheck({
  lessonId,
  question,
  options,
  alreadyCompleted,
}: {
  lessonId: string;
  question: string;
  options: string[];
  alreadyCompleted: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [done, setDone] = useState(alreadyCompleted);
  const [pending, startTransition] = useTransition();

  function check() {
    if (selected === null) return;
    startTransition(async () => {
      const isCorrect = await checkKnowledgeAnswer(lessonId, selected);
      setCorrect(isCorrect);
      await completeLesson(lessonId, isCorrect);
      setDone(true);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-800">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <label
            key={i}
            className={`block cursor-pointer rounded-lg border p-3 text-sm ${
              selected === i ? "border-orchid-deep bg-orchid-soft/40" : "border-ink-200 hover:border-orchid-300"
            } ${correct !== null ? "cursor-default" : ""}`}
          >
            <input
              type="radio"
              name={`kc-${lessonId}`}
              className="mr-2"
              checked={selected === i}
              disabled={correct !== null}
              onChange={() => setSelected(i)}
            />
            {opt}
          </label>
        ))}
      </div>
      {correct === null ? (
        <button
          onClick={check}
          disabled={selected === null || pending}
          className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
        >
          Check answer
        </button>
      ) : (
        <p className={`text-sm font-medium ${correct ? "text-sage-deep" : "text-danger"}`}>
          {correct ? "Correct." : "Not quite. Review the concept above and try the next lesson with this in mind."}
          {done && " Lesson marked complete."}
        </p>
      )}
    </div>
  );
}
