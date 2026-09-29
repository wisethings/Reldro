"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logWorkflowTimeSaved } from "@/lib/actions/workflows";

const PRESETS = [0, 5, 15, 30, 60];

/**
 * Shown once an employee has finished every step of a workflow, and only
 * until they've logged a figure for it (see myMinutesSaved in
 * WorkflowTimeSavedStats). "Not now" only dismisses it for this page view -
 * it isn't stored, so it can reappear on a later visit, which is the
 * deliberate tradeoff against adding a whole skip-tracking column for v1.
 */
export function LogTimeSavedPrompt({ workflowId }: { workflowId: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [custom, setCustom] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (dismissed) return null;

  function submit(minutes: number) {
    setError(null);
    startTransition(async () => {
      try {
        await logWorkflowTimeSaved(workflowId, minutes);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-orchid-soft bg-orchid-soft/40 p-4">
      <p className="text-sm font-medium text-ink-900">You've finished every step of this workflow - about how long did it save you today?</p>
      <p className="mt-1 text-xs text-ink-500">This builds a number from people who actually use it, instead of the catalog's own estimate.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={pending}
            onClick={() => submit(m)}
            className="rounded-full border border-ink-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-500 disabled:opacity-50"
          >
            {m === 0 ? "None" : `${m} min`}
          </button>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={480}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Other"
            className="w-20 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            disabled={pending || !custom.trim()}
            onClick={() => submit(Number(custom))}
            className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="text-xs text-ink-400 hover:text-ink-700">
          Not now
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
