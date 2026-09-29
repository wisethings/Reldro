"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleMilestone } from "@/lib/actions/marketplace";

type Milestone = { id: string; title: string; dueDate: Date; completed: boolean; stage: string };

export function MilestoneList({ milestones, currentStage }: { milestones: Milestone[]; currentStage: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-ink-200">
      {milestones.map((m) => {
        const isCurrent = !m.completed && m.stage === currentStage;
        return (
          <button
            key={m.id}
            disabled={pending}
            onClick={() => startTransition(() => toggleMilestone(m.id, !m.completed))}
            className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-ink-50"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  m.completed
                    ? "border-sage-deep bg-sage-deep"
                    : isCurrent
                      ? "border-ink-900 bg-ink-900"
                      : "border-ink-300 bg-white"
                }`}
              >
                {m.completed && <Check size={11} className="text-white" strokeWidth={3} />}
              </span>
              <span
                className={`text-sm font-medium uppercase tracking-wide ${
                  m.completed ? "text-ink-400 line-through" : isCurrent ? "text-ink-900" : "text-ink-500"
                }`}
              >
                {m.title}
              </span>
            </div>
            <span className="text-[11px] text-ink-400">{m.dueDate.toLocaleDateString()}</span>
          </button>
        );
      })}
      {milestones.length === 0 && <p className="px-5 py-5 text-sm text-ink-500">No milestones yet.</p>}
    </div>
  );
}
