"use client";

import { useState, useTransition } from "react";
import { updateProjectBudget } from "@/lib/actions/marketplace";

export function ProjectBudgetEditor({ projectId, budget }: { projectId: string; budget: number | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-orchid-deep hover:text-oxblood">
        {budget ? "Edit budget →" : "Set budget →"}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateProjectBudget(projectId, value.trim() ? Number(value) : null);
          setEditing(false);
        });
      }}
      className="mt-1.5 flex items-center gap-1.5"
    >
      <input
        type="number"
        min="0"
        step="1"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
        className="w-24 rounded-md border border-ink-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button disabled={pending} className="text-xs font-medium text-sage-deep hover:underline disabled:opacity-50">
        Save
      </button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-ink-400 hover:text-ink-600">
        Cancel
      </button>
    </form>
  );
}
