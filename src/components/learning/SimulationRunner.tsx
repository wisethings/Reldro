"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { revealDecisionConsequence, submitSimulationAttempt } from "@/lib/actions/learning";
import type { SimulationDimensions } from "@/lib/ai/simulationEvaluator";
import { ProgressBar } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

const DIMENSION_LABELS: Record<keyof SimulationDimensions, string> = {
  reasoning: "Reasoning",
  aiUsage: "AI usage",
  promptQuality: "Prompt quality",
  accuracy: "Accuracy",
  workflowAdherence: "Workflow adherence",
};

type Attempt = { id: string; score: number; passed: boolean; completedAt: string; dimensions: SimulationDimensions };
type DebriefResult = {
  score: number;
  passed: boolean;
  dimensions: SimulationDimensions;
  feedback: string;
  expertApproach: string;
  recommendedLesson: { id: string; title: string; skill: string } | null;
};

function DimensionBar({ dimension, value }: { dimension: keyof SimulationDimensions; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{DIMENSION_LABELS[dimension]}</span>
        <span className="font-medium text-ink-900">{value}</span>
      </div>
      <ProgressBar value={value} className="mt-1" tone={value >= 70 ? "green" : value >= 45 ? "amber" : "red"} />
    </div>
  );
}

export function SimulationRunner({
  simulationId,
  decisionPrompt,
  decisionOptions,
  aiOutputSample,
  aiOutputIssues,
  reasoningPrompt,
  pastAttempts,
}: {
  simulationId: string;
  decisionPrompt: string;
  decisionOptions: { id: string; label: string }[];
  aiOutputSample: string;
  aiOutputIssues: { id: string; label: string }[];
  reasoningPrompt: string;
  pastAttempts: Attempt[];
}) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(decisionOptions.length ? 0 : aiOutputIssues.length ? 1 : 2);
  const [pending, startTransition] = useTransition();

  const [decisionChoiceId, setDecisionChoiceId] = useState<string | null>(null);
  const [decisionConsequence, setDecisionConsequence] = useState<string | null>(null);

  const [checkedIssues, setCheckedIssues] = useState<Set<string>>(new Set());

  const [reasoningResponse, setReasoningResponse] = useState("");
  const [result, setResult] = useState<DebriefResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>(pastAttempts);

  function chooseDecision(optionId: string) {
    setDecisionChoiceId(optionId);
    startTransition(async () => {
      const revealed = await revealDecisionConsequence(simulationId, optionId);
      setDecisionConsequence(revealed?.consequence ?? "");
    });
  }

  function toggleIssue(issueId: string) {
    setCheckedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const evaluation = await submitSimulationAttempt(simulationId, {
        decisionChoiceId,
        evaluationChoices: Array.from(checkedIssues),
        reasoningResponse,
      });
      setResult(evaluation);
      setAttempts((prev) => [
        ...prev,
        { id: `local-${prev.length}`, score: evaluation.score, passed: evaluation.passed, completedAt: new Date().toISOString(), dimensions: evaluation.dimensions },
      ]);
    });
  }

  function retry() {
    setStep(decisionOptions.length ? 0 : aiOutputIssues.length ? 1 : 2);
    setDecisionChoiceId(null);
    setDecisionConsequence(null);
    setCheckedIssues(new Set());
    setReasoningResponse("");
    setResult(null);
  }

  if (result) {
    const previousBest = pastAttempts.length ? Math.max(...pastAttempts.map((a) => a.score)) : null;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-900">Debrief</p>
          <Badge tone={result.passed ? "green" : "amber"}>{result.passed ? "Passed" : "Not yet passing"}</Badge>
        </div>
        <div>
          <p className="text-3xl font-semibold text-ink-900">{result.score}/100</p>
          {previousBest !== null && (
            <p className="text-xs text-ink-500">
              {result.score > previousBest ? `Up from your previous best of ${previousBest}.` : `Your best so far is ${Math.max(previousBest, result.score)}.`}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {(Object.keys(result.dimensions) as (keyof SimulationDimensions)[]).map((d) => (
            <DimensionBar key={d} dimension={d} value={result.dimensions[d]} />
          ))}
        </div>
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
          <p className="text-sm font-medium text-ink-900">Feedback</p>
          <p className="mt-1 text-sm text-ink-700">{result.feedback}</p>
        </div>
        {result.expertApproach && (
          <div className="rounded-lg border border-orchid-soft bg-orchid-soft/40 p-4">
            <p className="text-sm font-medium text-orchid-deep">Expert approach</p>
            <p className="mt-1 text-sm text-ink-700">{result.expertApproach}</p>
          </div>
        )}
        {attempts.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-medium text-ink-500">Your attempts</p>
            <div className="flex flex-wrap gap-2">
              {attempts.map((a, i) => (
                <Badge key={a.id} tone={a.passed ? "green" : "neutral"}>
                  Attempt {i + 1}: {a.score}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {result.recommendedLesson && (
          <div className="rounded-lg border border-ink-200 p-4">
            <p className="text-xs text-ink-500">Recommended practice</p>
            <Link href={`/dashboard/learn/lessons/${result.recommendedLesson.id}`} className="mt-1 block text-sm font-medium text-orchid-deep hover:text-oxblood">
              {result.recommendedLesson.title} →
            </Link>
          </div>
        )}
        <button
          onClick={retry}
          className="w-full rounded-full border border-ink-300 px-4 py-2.5 text-sm font-medium text-ink-800 hover:border-orchid-deep hover:text-orchid-deep"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="simulation-runner">
      <div className="flex gap-1.5">
        {["Decision", "Evaluate", "Reasoning"].map((label, i) => (
          <div key={label} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-orchid-deep" : "bg-ink-200"}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-900">{decisionPrompt}</p>
          <div className="space-y-2">
            {decisionOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => chooseDecision(opt.id)}
                disabled={pending || decisionChoiceId !== null}
                className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                  decisionChoiceId === opt.id ? "border-orchid-deep bg-orchid-soft/40" : "border-ink-200 hover:border-orchid-300"
                } disabled:cursor-default`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {decisionConsequence !== null && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
              <p className="text-sm font-medium text-ink-900">What happened</p>
              <p className="mt-1 text-sm text-ink-700">{decisionConsequence || "Loading…"}</p>
              <button
                onClick={() => setStep(aiOutputIssues.length ? 1 : 2)}
                disabled={!decisionConsequence}
                className="mt-3 rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-900">Here's an AI-generated output for this situation. Check anything you'd flag as a real problem before it's used.</p>
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 text-sm italic text-ink-700 whitespace-pre-line">{aiOutputSample}</div>
          <div className="space-y-2">
            {aiOutputIssues.map((issue) => (
              <label key={issue.id} className="flex items-start gap-2 rounded-lg border border-ink-200 p-3 text-sm hover:border-orchid-300">
                <input
                  type="checkbox"
                  checked={checkedIssues.has(issue.id)}
                  onChange={() => toggleIssue(issue.id)}
                  className="mt-0.5"
                />
                <span className="text-ink-700">{issue.label}</span>
              </label>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800">
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-ink-900">{reasoningPrompt}</p>
          <textarea
            value={reasoningResponse}
            onChange={(e) => setReasoningResponse(e.target.value)}
            rows={7}
            placeholder="Walk through your reasoning: what would you prioritize, where would you use AI, and what would you check before acting?"
            className="w-full rounded-lg border border-ink-300 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={submit}
            disabled={pending || reasoningResponse.trim().length < 5}
            className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-40"
          >
            {pending ? "Evaluating…" : "Submit and see debrief"}
          </button>
        </div>
      )}
    </div>
  );
}
