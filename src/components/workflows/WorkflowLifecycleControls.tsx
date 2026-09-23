"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowAdoptionStatus } from "@prisma/client";
import { setWorkflowStage, setWorkflowOwner } from "@/lib/actions/workflows";
import { WORKFLOW_STATUS_ORDER, WORKFLOW_STATUS_LABEL } from "@/lib/workflowLifecycle";

export function WorkflowLifecycleControls({
  workflowId,
  currentStatus,
  currentOwnerId,
  eligibleEmployees,
}: {
  workflowId: string;
  currentStatus: WorkflowAdoptionStatus;
  currentOwnerId: string | null;
  eligibleEmployees: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-ink-600">Deployment stage</label>
        <select
          defaultValue={currentStatus}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await setWorkflowStage(workflowId, e.target.value as WorkflowAdoptionStatus);
              router.refresh();
            })
          }
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {WORKFLOW_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{WORKFLOW_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-600">Owner</label>
        <select
          defaultValue={currentOwnerId ?? ""}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await setWorkflowOwner(workflowId, e.target.value || null);
              router.refresh();
            })
          }
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Unassigned</option>
          {eligibleEmployees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
