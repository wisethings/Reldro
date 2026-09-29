"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateProjectDescription } from "@/lib/actions/marketplace";

export function ProjectDescriptionEditor({ projectId, description }: { projectId: string; description: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-700">{description}</p>
        <button
          onClick={() => setEditing(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          <Pencil size={12} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <div className="mt-2 flex gap-2">
        <button
          disabled={pending || !value.trim()}
          onClick={() =>
            startTransition(async () => {
              await updateProjectDescription(projectId, value);
              setEditing(false);
            })
          }
          className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(description);
            setEditing(false);
          }}
          className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
