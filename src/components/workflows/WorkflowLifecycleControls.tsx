"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkflowAdoptionStatus } from "@prisma/client";
import { setWorkflowStage, setWorkflowOwner } from "@/lib/actions/workflows";
import { WORKFLOW_STATUS_ORDER, WORKFLOW_STATUS_LABEL, DEPLOYED_STATUSES } from "@/lib/workflowLifecycle";

export function WorkflowLifecycleControls({
  workflowId,
  currentStatus,
  currentOwnerId,
  eligibleEmployees,
  dependenciesMet,
  unmetDependencyTitles,
}: {
  workflowId: string;
  currentStatus: WorkflowAdoptionStatus;
  currentOwnerId: string | null;
  eligibleEmployees: { id: string; name: string }[];
  dependenciesMet: boolean;
  unmetDependencyTitles: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
              setError(null);
              try {
                await setWorkflowStage(workflowId, e.target.value as WorkflowAdoptionStatus);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't update the deployment stage.");
              }
            })
          }
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {WORKFLOW_STATUS_ORDER.map((s) => (
            <option key={s} value={s} disabled={!dependenciesMet && DEPLOYED_STATUSES.includes(s)}>
              {WORKFLOW_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {!dependenciesMet && (
          <p className="mt-1 text-xs text-ink-500">Requires first: {unmetDependencyTitles.join(", ")}</p>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
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
