"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { updateTaskStatus } from "@/lib/actions/marketplace";
import { Badge } from "@/components/ui/Badge";

type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE"; dueDate: Date | null };

const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
  BLOCKED: "TODO",
};

const STATUS_LABEL: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
  BLOCKED: "Blocked",
};

const STATUS_TONE: Record<Task["status"], "neutral" | "amber" | "green" | "red"> = {
  TODO: "neutral",
  IN_PROGRESS: "amber",
  DONE: "green",
  BLOCKED: "red",
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-ink-200">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 px-5 py-3">
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateTaskStatus(task.id, NEXT_STATUS[task.status]))}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              task.status === "DONE" ? "border-sage-deep bg-sage-deep" : "border-ink-300 bg-white hover:border-ink-400"
            }`}
          >
            {task.status === "DONE" && <Check size={11} className="text-white" strokeWidth={3} />}
          </button>
          <span className={`min-w-0 flex-1 truncate text-sm ${task.status === "DONE" ? "text-ink-400 line-through" : "text-ink-800"}`}>
            {task.title}
          </span>
          <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
          {task.dueDate && <span className="shrink-0 text-[11px] text-ink-400">Due {task.dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
        </div>
      ))}
      {tasks.length === 0 && <p className="px-5 py-5 text-sm text-ink-500">No tasks match this filter.</p>}
    </div>
  );
}
