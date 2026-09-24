"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomWorkflow } from "@/lib/actions/customWorkflows";

export function DeleteWorkflowButton({ workflowId }: { workflowId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this workflow and all its steps? This can't be undone.")) {
          startTransition(async () => {
            await deleteCustomWorkflow(workflowId);
            router.push("/dashboard/workflows/manage");
          });
        }
      }}
      className="shrink-0 rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete workflow"}
    </button>
  );
}
