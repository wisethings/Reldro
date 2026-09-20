"use client";

import { useTransition } from "react";
import { toggleMilestone } from "@/lib/actions/marketplace";

type Milestone = { id: string; title: string; dueDate: Date; completed: boolean };

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-ink-100">
      {milestones.map((m) => (
        <button
          key={m.id}
          disabled={pending}
          onClick={() => startTransition(() => toggleMilestone(m.id, !m.completed))}
          className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-ink-50"
        >
          <div className="flex items-center gap-3">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${m.completed ? "border-emerald-500 bg-emerald-500" : "border-ink-300"}`}>
              {m.completed && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`text-sm ${m.completed ? "text-ink-400 line-through" : "text-ink-800"}`}>{m.title}</span>
          </div>
          <span className="text-[11px] text-ink-400">{m.dueDate.toLocaleDateString()}</span>
        </button>
      ))}
      {milestones.length === 0 && <p className="px-5 py-5 text-sm text-ink-500">No milestones yet.</p>}
    </div>
  );
}
