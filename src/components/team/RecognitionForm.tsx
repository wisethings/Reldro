"use client";

import { useState, useTransition } from "react";
import { recognizeEmployee, sendPeerRecognition } from "@/lib/actions/rewards";
import type { RecognitionCategory } from "@prisma/client";

const CATEGORY_LABELS: Record<RecognitionCategory, string> = {
  AI_ADOPTION: "AI adoption",
  WORKFLOW_INNOVATION: "Workflow innovation",
  LEARNING: "Learning",
  BUSINESS_IMPACT: "Business impact",
  COLLABORATION: "Collaboration",
  AI_LEADERSHIP: "AI leadership",
};

export function RecognitionForm({ toEmployeeId, mode }: { toEmployeeId: string; mode: "manager" | "peer" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<RecognitionCategory>("AI_ADOPTION");
  const [message, setMessage] = useState("");
  const [awardPointsChecked, setAwardPointsChecked] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <p className="text-xs font-medium text-sage-deep">Recognition sent.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-orchid-deep hover:text-orchid-deep"
      >
        {mode === "manager" ? "Recognize" : "Give recognition"}
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-lg border border-ink-200 p-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as RecognitionCategory)}
        className="w-full rounded-lg border border-ink-300 px-3 py-2 text-xs"
      >
        {(Object.keys(CATEGORY_LABELS) as RecognitionCategory[]).map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="What did they do?"
        className="w-full rounded-lg border border-ink-300 p-2 text-xs"
      />
      {mode === "manager" && (
        <label className="flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={awardPointsChecked} onChange={(e) => setAwardPointsChecked(e.target.checked)} />
          Award points with this recognition
        </label>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending || !message.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                if (mode === "manager") {
                  await recognizeEmployee({ toEmployeeId, category, message, awardPoints: awardPointsChecked });
                } else {
                  await sendPeerRecognition({ toEmployeeId, category, message });
                }
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            })
          }
          className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-40"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs text-ink-500 hover:text-ink-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
