"use client";

import { useEffect, useState, useTransition } from "react";
import { addProjectMember, removeProjectMember } from "@/lib/actions/marketplace";

type Member = { employeeId: string; name: string; jobTitle: string };
type Candidate = { id: string; name: string; jobTitle: string };

export function ProjectTeamCard({
  projectId,
  specialistName,
  specialistHeadline,
  members,
  candidates,
  canManage,
}: {
  projectId: string;
  specialistName?: string;
  specialistHeadline?: string;
  members: Member[];
  candidates: Candidate[];
  canManage: boolean;
}) {
  const [selected, setSelected] = useState(candidates[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  // `candidates` is a fresh array from the server after every add/remove
  // (revalidatePath), but `selected` is local state that otherwise survives
  // those re-renders untouched. Without this, adding someone leaves the
  // dropdown's underlying value pointing at the person just added (now gone
  // from the list), so a second "Add to project" click silently re-submits
  // the same id and does nothing.
  useEffect(() => {
    if (!candidates.some((c) => c.id === selected)) {
      setSelected(candidates[0]?.id ?? "");
    }
  }, [candidates, selected]);

  return (
    <div className="divide-y divide-ink-200">
      {specialistName && (
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-sm font-medium text-ink-900">{specialistName}</p>
            <p className="text-xs text-ink-500">{specialistHeadline ?? "Specialist"}</p>
          </div>
          <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-orchid-soft px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-orchid-deep">
            Specialist
          </span>
        </div>
      )}

      {members.map((m) => (
        <div key={m.employeeId} className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-sm font-medium text-ink-900">{m.name}</p>
            <p className="text-xs text-ink-500">{m.jobTitle}</p>
          </div>
          {canManage && (
            <button
              disabled={pending}
              onClick={() => startTransition(() => removeProjectMember(projectId, m.employeeId))}
              className="text-xs font-medium text-ink-400 hover:text-danger disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      {members.length === 0 && !specialistName && <p className="px-5 py-5 text-sm text-ink-500">No one assigned yet.</p>}

      {canManage && candidates.length > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selected) return;
            startTransition(() => addProjectMember(projectId, selected));
          }}
          className="flex gap-2 p-3"
        >
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.jobTitle}
              </option>
            ))}
          </select>
          <button
            disabled={pending}
            className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Add to project
          </button>
        </form>
      )}

      {canManage && candidates.length === 0 && (
        <p className="px-5 py-4 text-xs text-ink-400">Everyone in your organization is already on this project.</p>
      )}
    </div>
  );
}
