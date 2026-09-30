"use client";

import { useState } from "react";
import { deleteDepartment, renameDepartment } from "@/lib/actions/settings";
import { Input } from "@/components/ui/Field";
import { useAct } from "@/components/safety/useAct";

/** One crew in Settings: rename it, or delete it (people keep their accounts and just lose the crew label). */
export function CrewRow({ id, name, people }: { id: string; name: string; people: number }) {
  const { run, pending, error } = useAct();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
      {editing ? (
        <form
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renameDepartment(id, value), () => setEditing(false));
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} required aria-label={`New name for ${name}`} className="w-auto min-w-[10rem] flex-1" autoFocus />
          <button disabled={pending} className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setEditing(false); setValue(name); }} className="text-xs font-medium text-ink-600 hover:text-ink-900">Cancel</button>
        </form>
      ) : (
        <>
          <span className="min-w-0">
            <span className="font-medium text-ink-900">{name}</span>
            <span className="ml-2 text-xs text-ink-500">{people} {people === 1 ? "person" : "people"}</span>
          </span>
          <span className="flex items-center gap-4">
            <button onClick={() => setEditing(true)} className="text-xs font-medium text-orchid-deep hover:text-oxblood" aria-label={`Rename ${name}`}>Rename</button>
            <button
              disabled={pending}
              onClick={() => confirm(people > 0 ? `Delete the crew "${name}"? The ${people} ${people === 1 ? "person" : "people"} in it will stay in Reldro with no crew.` : `Delete the crew "${name}"?`) && run(() => deleteDepartment(id))}
              className="text-xs font-medium text-danger hover:underline"
              aria-label={`Delete ${name}`}
            >
              Delete
            </button>
          </span>
        </>
      )}
      {error && <p role="alert" className="w-full text-xs text-danger">{error}</p>}
    </li>
  );
}
