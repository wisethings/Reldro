"use client";

import { useState, useTransition } from "react";
import { updateProjectTargetDate } from "@/lib/actions/marketplace";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ProjectTargetDateEditor({ projectId, targetEndDate }: { projectId: string; targetEndDate: Date | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toDateInputValue(targetEndDate));
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="mt-1 text-xs font-medium text-orchid-deep hover:text-oxblood">
        {targetEndDate ? "Edit date →" : "Set date →"}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateProjectTargetDate(projectId, value || null);
          setEditing(false);
        });
      }}
      className="mt-1.5 flex items-center gap-1.5"
    >
      <input
        type="date"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-md border border-ink-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
