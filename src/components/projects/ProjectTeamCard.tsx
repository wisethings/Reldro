"use client";

import { useEffect, useState, useTransition } from "react";
import { addProjectMember, removeProjectMember } from "@/lib/actions/marketplace";
import { Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

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
        <div className="flex items-center gap-3 px-5 py-3">
          <Avatar name={specialistName} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">{specialistName}</p>
            <p className="text-xs text-ink-500">{specialistHeadline ?? "Specialist"}</p>
          </div>
          <Badge tone="brand">Specialist</Badge>
        </div>
      )}

      {members.map((m) => (
        <div key={m.employeeId} className="flex items-center gap-3 px-5 py-3">
          <Avatar name={m.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">{m.name}</p>
            <p className="text-xs text-ink-500">{m.jobTitle}</p>
          </div>
          <Badge tone="neutral">Contributor</Badge>
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
          <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.jobTitle}
              </option>
            ))}
          </Select>
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
