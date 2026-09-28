"use client";

import { useState, useTransition } from "react";
import { addProjectDeliverable } from "@/lib/actions/marketplace";
import { Input } from "@/components/ui/Field";

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
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Deliverable name"
        className="min-w-[160px] flex-1"
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Link (doc, deck, file...)"
        className="min-w-[220px] flex-[2]"
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
