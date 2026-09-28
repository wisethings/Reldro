"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleChecklistItem } from "@/lib/actions/workflows";

export function ChecklistItemCheckbox({
  workflowId,
  itemIndex,
  completed,
  completedByName,
  canToggle,
}: {
  workflowId: string;
  itemIndex: number;
  completed: boolean;
  completedByName: string | null;
  canToggle: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={!canToggle || pending}
      title={
        completedByName
          ? `Completed by ${completedByName}`
          : canToggle
            ? "Mark as done"
            : "Only this workflow's owner, assignee, its department lead, or a company admin can check this off"
      }
      onClick={() =>
        startTransition(async () => {
          await toggleChecklistItem(workflowId, itemIndex, !completed);
          router.refresh();
        })
      }
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
        completed ? "border-sage-deep bg-sage-deep text-white" : "border-ink-300"
      } ${canToggle ? "cursor-pointer hover:border-brand-400" : "cursor-not-allowed opacity-70"}`}
    >
      {completed ? "✓" : ""}
    </button>
  );
}
