"use client";

import { useState, useTransition } from "react";
import { addProjectDeliverable } from "@/lib/actions/marketplace";

export function AddDeliverableForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;
        const n = name;
        const u = url;
        setName("");
        setUrl("");
        startTransition(() => addProjectDeliverable(projectId, n, u));
      }}
      className="flex flex-wrap gap-2 border-t border-ink-200 p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Deliverable name"
        className="min-w-[160px] flex-1 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link (doc, deck, file...)"
        className="min-w-[220px] flex-[2] rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        disabled={pending}
        className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}
