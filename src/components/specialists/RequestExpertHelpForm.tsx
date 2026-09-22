"use client";

import { useState, useTransition } from "react";
import { requestExpertHelp } from "@/lib/actions/marketplace";

export function RequestExpertHelpForm({
  opportunityId,
  workflowId,
}: {
  opportunityId?: string;
  workflowId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="rounded-lg border border-sage bg-sage p-4 text-sm text-sage-deep">
        Request sent. Our team will match you with a vetted specialist and follow up shortly.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
      >
        Request expert help
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await requestExpertHelp({
            opportunityId,
            workflowId,
            notes,
            timeline: timeline || undefined,
            budget: budget ? Number(budget) : undefined,
          });
          setSubmitted(true);
        });
      }}
      className="space-y-3 rounded-lg border border-ink-200 p-4"
    >
      <div>
        <label className="block text-xs font-medium text-ink-600">What do you need help with?</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          rows={3}
          placeholder="Describe the goal, current blockers, or constraints…"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-600">Target timeline (optional)</label>
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. 6 weeks"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600">Budget (optional)</label>
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 10000"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !notes.trim()}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
