"use client";

import { useState, useTransition } from "react";
import { addProjectMilestone } from "@/lib/actions/marketplace";
import { Input, Select } from "@/components/ui/Field";

const STAGES = ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"] as const;
type Stage = (typeof STAGES)[number];

const LABELS: Record<Stage, string> = {
  DISCOVERY: "Discovery",
  WORKFLOW_DESIGN: "Workflow Design",
  IMPLEMENTATION: "Implementation",
  TRAINING: "Training",
  LAUNCH: "Launch",
  MEASUREMENT: "Measurement",
  OPTIMIZATION: "Optimization",
};

export function AddMilestoneForm({ projectId, currentStage }: { projectId: string; currentStage: Stage }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [stage, setStage] = useState<Stage>(currentStage);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !dueDate) return;
        const t = title;
        const d = dueDate;
        const s = stage;
        setTitle("");
        setDueDate("");
        startTransition(() => addProjectMilestone(projectId, t, d, s));
      }}
      className="grid gap-2 border-t border-ink-200 p-3 sm:grid-cols-5"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone title" className="sm:col-span-2" />
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <Select value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {LABELS[s]}
          </option>
        ))}
      </Select>
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        Add milestone
      </button>
    </form>
  );
}
