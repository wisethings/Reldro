"use client";

import { useState, useTransition } from "react";
import { deleteWorkflowStep } from "@/lib/actions/customWorkflows";
import { Modal } from "@/components/ui/Modal";
import { CreateWorkflowStepForm } from "./CreateWorkflowStepForm";
import type { WorkflowStep } from "@prisma/client";

export function WorkflowStepManageRow({ step, workflowId }: { step: WorkflowStep; workflowId: string }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">{step.order}. {step.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{step.description}</p>
        {step.humanCheckpoint && <p className="mt-1 text-[11px] font-medium text-amber-700">Human checkpoint</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-orchid-deep hover:underline">
          Edit
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (confirm("Remove this step? This can't be undone.")) startTransition(() => deleteWorkflowStep(step.id, workflowId));
          }}
          className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {editing && (
        <Modal title="Edit step" onClose={() => setEditing(false)}>
          <CreateWorkflowStepForm workflowId={workflowId} step={step} onSaved={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}
