"use client";

import { useState, useTransition } from "react";
import { addProjectTask } from "@/lib/actions/marketplace";
import { Input } from "@/components/ui/Field";

export function AddTaskForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const value = title;
        setTitle("");
        startTransition(() => addProjectTask(projectId, value));
      }}
      className="flex gap-2 border-t border-ink-200 p-3"
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" className="flex-1" />
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
