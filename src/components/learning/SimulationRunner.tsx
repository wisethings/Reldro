"use client";

import { useState, useTransition } from "react";
import { submitSimulationAttempt } from "@/lib/actions/learning";
import type { SimulationEvaluation } from "@/lib/ai/simulationEvaluator";

export function SimulationRunner({ simulationId }: { simulationId: string }) {
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<SimulationEvaluation | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={8}
        placeholder="Walk through your reasoning: what would you prioritize, where would you use AI, and what would you check before acting?"
        className="w-full rounded-lg border border-ink-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        onClick={() =>
          startTransition(async () => {
            const evaluation = await submitSimulationAttempt(simulationId, response);
            setResult(evaluation);
          })
        }
        disabled={pending || response.trim().length < 5}
        className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
      >
        {pending ? "Evaluating…" : "Submit response"}
      </button>

      {result && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-900">Score: {result.score}/100</p>
          <p className="mt-1 text-sm text-ink-700">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
