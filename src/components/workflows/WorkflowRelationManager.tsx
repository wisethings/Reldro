"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { addWorkflowLink, removeWorkflowLink, addWorkflowDependency, removeWorkflowDependency } from "@/lib/actions/workflowRelations";

type Item = { id: string; title: string; department: string; met?: boolean };
type Choice = { id: string; title: string; department: string };

/**
 * Shared UI for both related-workflow links (symmetric, purely
 * informational) and prerequisite dependencies (directed, gates adoption) -
 * same list-plus-picker shape, just different actions and whether a
 * met/not-met badge makes sense.
 */
export function WorkflowRelationManager({
  mode,
  workflowId,
  items,
  choices,
  canManage,
}: {
  mode: "link" | "dependency";
  workflowId: string;
  items: Item[];
  choices: Choice[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const router = useRouter();

  const add = mode === "link" ? addWorkflowLink : addWorkflowDependency;
  const remove = mode === "link" ? removeWorkflowLink : removeWorkflowDependency;

  function submitAdd() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await add(workflowId, selected);
        setSelected("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  function submitRemove(targetId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await remove(workflowId, targetId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't remove that.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-ink-500">{mode === "link" ? "No related workflows yet." : "No prerequisites - this workflow can be adopted any time."}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2">
              <div className="min-w-0">
                <Link href={`/dashboard/workflows/${item.id}`} className="text-sm font-medium text-ink-900 hover:text-orchid-deep">
                  {item.title}
                </Link>
                <p className="text-xs text-ink-500">{item.department}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {mode === "dependency" && <Badge tone={item.met ? "green" : "amber"}>{item.met ? "Adopted" : "Not yet"}</Badge>}
                {canManage && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submitRemove(item.id)}
                    className="shrink-0 rounded-full border border-ink-200 px-2.5 py-1 text-[11px] font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={pending || choices.length === 0}
            className="min-w-[12rem] flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">{choices.length === 0 ? "No other workflows available" : "Choose a workflow…"}</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.department} · {c.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !selected}
            onClick={submitAdd}
            className="rounded-full bg-brand-700 px-3 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            {mode === "link" ? "Add related workflow" : "Add prerequisite"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
