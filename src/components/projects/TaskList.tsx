"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/marketplace";

type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" };

const NEXT_STATUS: Record<Task["status"], Task["status"]> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  DONE: "TODO",
  BLOCKED: "TODO",
};

const STATUS_STYLE: Record<Task["status"], string> = {
  TODO: "border-ink-300",
  IN_PROGRESS: "border-amber-400 bg-amber-50",
  DONE: "border-emerald-500 bg-emerald-500",
  BLOCKED: "border-red-400 bg-red-50",
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="divide-y divide-ink-100">
      {tasks.map((task) => (
        <button
          key={task.id}
          disabled={pending}
          onClick={() => startTransition(() => updateTaskStatus(task.id, NEXT_STATUS[task.status]))}
          className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-50"
        >
          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${STATUS_STYLE[task.status]}`}>
            {task.status === "DONE" && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className={`text-sm ${task.status === "DONE" ? "text-ink-400 line-through" : "text-ink-800"}`}>{task.title}</span>
          <span className="ml-auto text-[11px] text-ink-400">{task.status.replace("_", " ").toLowerCase()}</span>
        </button>
      ))}
      {tasks.length === 0 && <p className="px-5 py-5 text-sm text-ink-500">No tasks yet.</p>}
    </div>
  );
}
