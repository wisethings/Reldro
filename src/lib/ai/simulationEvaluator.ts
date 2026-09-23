import type { DecisionOption, AiOutputIssue } from "@/lib/simulationCatalog";

/**
 * Lightweight, transparent rubric for AI simulation attempts. Scores
 * reasoning quality from observable signals (the decision made, the
 * output-evaluation checklist, and the written reasoning) rather than a
 * black-box model call, so feedback is explainable and reproducible in a
 * demo environment. See ai/assistant.ts for where a real model provider IS
 * used - this stays rule-based because grading a fixed rubric against known
 * ground truth (decisionOptions[].quality, aiOutputIssues[].present) doesn't
 * need one, and a fixed rubric is auditable in a way a model call isn't.
 */

export type SimulationDimensions = {
  reasoning: number;
  aiUsage: number;
  promptQuality: number;
  accuracy: number;
  workflowAdherence: number;
};

export type SimulationEvaluation = {
  score: number;
  passed: boolean;
  dimensions: SimulationDimensions;
  feedback: string;
};

const PASS_THRESHOLD = 70;

const QUALITY_SCORE: Record<DecisionOption["quality"], number> = {
  strong: 100,
  partial: 60,
  weak: 20,
};

const PRIORITIZATION_SIGNALS = ["prioritiz", "urgent", "first", "high value", "high-value", "criteria", "score", "rank"];
const AI_USAGE_SIGNALS = ["ai", "draft", "summar", "prompt", "generate", "classif"];
const RISK_SIGNALS = ["review", "verify", "check", "confirm", "escalat", "human"];

function scoreDecision(decisionOptions: DecisionOption[], decisionChoiceId: string | null): { score: number; note: string } {
  const choice = decisionOptions.find((o) => o.id === decisionChoiceId);
  if (!choice) return { score: 40, note: "No decision was recorded for this simulation." };
  return { score: QUALITY_SCORE[choice.quality], note: choice.consequence };
}

function scoreEvaluationChecklist(
  aiOutputIssues: AiOutputIssue[],
  selectedIds: string[]
): { score: number; note: string } {
  if (aiOutputIssues.length === 0) return { score: 60, note: "No output-evaluation checklist was configured for this simulation." };
  const selected = new Set(selectedIds);
  let correct = 0;
  const missedIssues: string[] = [];
  const falseFlags: string[] = [];
  for (const issue of aiOutputIssues) {
    const wasSelected = selected.has(issue.id);
    if (wasSelected === issue.present) {
      correct += 1;
    } else if (issue.present) {
      missedIssues.push(issue.label);
    } else {
      falseFlags.push(issue.label);
    }
  }
  const score = Math.round((correct / aiOutputIssues.length) * 100);
  const notes: string[] = [];
  if (missedIssues.length === 0 && falseFlags.length === 0) {
    notes.push("Correctly identified every real issue in the AI output and didn't flag anything that wasn't actually a problem.");
  } else {
    if (missedIssues.length > 0) notes.push(`Missed a real issue: ${missedIssues.join("; ")}.`);
    if (falseFlags.length > 0) notes.push(`Flagged something that wasn't actually a problem: ${falseFlags.join("; ")}.`);
  }
  return { score, note: notes.join(" ") };
}

function scoreReasoningText(response: string): {
  aiUsage: number;
  promptQuality: number;
  workflowAdherence: number;
  notes: string[];
} {
  const text = response.toLowerCase();
  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;
  const notes: string[] = [];

  let promptQuality = 30;
  if (wordCount >= 40) {
    promptQuality += 20;
    notes.push("Clear, sufficiently detailed reasoning.");
  } else if (wordCount >= 15) {
    promptQuality += 10;
    notes.push("Reasoning is present but could be more detailed.");
  } else {
    notes.push("Written response is too brief to demonstrate structured reasoning.");
  }
  if (PRIORITIZATION_SIGNALS.some((s) => text.includes(s))) {
    promptQuality += 30;
    notes.push("Applied explicit criteria in the written reasoning.");
  } else {
    notes.push("Consider naming the specific criteria you used to reason through this.");
  }

  let aiUsage = 20;
  if (AI_USAGE_SIGNALS.some((s) => text.includes(s))) {
    aiUsage = 90;
    notes.push("Described how AI was used in the workflow.");
  } else {
    notes.push("Be explicit about where and how you'd use AI in this task.");
  }

  let workflowAdherence = 30;
  if (RISK_SIGNALS.some((s) => text.includes(s))) {
    workflowAdherence = 90;
    notes.push("Included a human review or verification checkpoint in the written reasoning.");
  } else {
    notes.push("Add a verification step before acting on AI output.");
  }

  return {
    aiUsage,
    promptQuality: Math.max(0, Math.min(100, promptQuality)),
    workflowAdherence,
    notes,
  };
}

export function evaluateSimulationAttempt(params: {
  decisionOptions: DecisionOption[];
  decisionChoiceId: string | null;
  aiOutputIssues: AiOutputIssue[];
  evaluationChoices: string[];
  reasoningResponse: string;
}): SimulationEvaluation {
  const decision = scoreDecision(params.decisionOptions, params.decisionChoiceId);
  const checklist = scoreEvaluationChecklist(params.aiOutputIssues, params.evaluationChoices);
  const text = scoreReasoningText(params.reasoningResponse);

  const dimensions: SimulationDimensions = {
    reasoning: Math.round((decision.score + text.promptQuality) / 2),
    aiUsage: text.aiUsage,
    promptQuality: text.promptQuality,
    accuracy: checklist.score,
    workflowAdherence: Math.round((decision.score + text.workflowAdherence) / 2),
  };

  const score = Math.round(
    (dimensions.reasoning + dimensions.aiUsage + dimensions.promptQuality + dimensions.accuracy + dimensions.workflowAdherence) / 5
  );

  const feedback = [decision.note, checklist.note, ...text.notes].filter(Boolean).join(" ");

  return { score, passed: score >= PASS_THRESHOLD, dimensions, feedback };
}
