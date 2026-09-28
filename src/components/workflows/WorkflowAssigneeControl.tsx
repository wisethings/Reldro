"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWorkflowAssignee } from "@/lib/actions/workflows";

export function WorkflowAssigneeControl({
  workflowId,
  currentAssigneeId,
  currentAssigneeName,
  myEmployeeId,
  canManageOthers,
  eligibleEmployees,
}: {
  workflowId: string;
  currentAssigneeId: string | null;
  currentAssigneeName: string | null;
  myEmployeeId: string | null;
  canManageOthers: boolean;
  eligibleEmployees: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isMe = myEmployeeId !== null && currentAssigneeId === myEmployeeId;

  function change(id: string | null) {
    startTransition(async () => {
      await setWorkflowAssignee(workflowId, id);
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block text-xs font-medium text-ink-600">Assignee</label>
      {canManageOthers ? (
        <select
          defaultValue={currentAssigneeId ?? ""}
          disabled={pending}
          onChange={(e) => change(e.target.value || null)}
          className="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Unassigned</option>
          {eligibleEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
              {e.id === myEmployeeId ? " (you)" : ""}
            </option>
          ))}
        </select>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <p className="text-sm text-ink-700">{currentAssigneeName ?? "Unassigned"}</p>
          {myEmployeeId && (
            <button
              type="button"
              disabled={pending}
              onClick={() => change(isMe ? null : myEmployeeId)}
              className="rounded-full border border-ink-300 px-2.5 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              {pending ? "…" : isMe ? "Remove myself" : "Assign to me"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
