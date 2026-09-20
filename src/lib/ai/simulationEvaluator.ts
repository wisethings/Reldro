/**
 * Lightweight, transparent rubric for AI simulation attempts. Scores
 * reasoning quality from observable signals in the employee's written
 * response rather than a black-box model call, so feedback is explainable
 * and reproducible in a demo environment.
 */
export type SimulationEvaluation = {
  score: number;
  feedback: string;
};

const PRIORITIZATION_SIGNALS = ["prioritiz", "urgent", "first", "high value", "high-value", "criteria", "score", "rank"];
const AI_USAGE_SIGNALS = ["ai", "draft", "summar", "prompt", "generate", "classif"];
const RISK_SIGNALS = ["review", "verify", "check", "confirm", "escalat", "human"];

export function evaluateSimulationResponse(response: string): SimulationEvaluation {
  const text = response.toLowerCase();
  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;

  let score = 30;
  const notes: string[] = [];

  if (wordCount >= 40) {
    score += 20;
    notes.push("Clear, sufficiently detailed reasoning.");
  } else if (wordCount >= 15) {
    score += 10;
    notes.push("Reasoning is present but could be more detailed.");
  } else {
    notes.push("Response is too brief to demonstrate structured reasoning.");
  }

  if (PRIORITIZATION_SIGNALS.some((s) => text.includes(s))) {
    score += 20;
    notes.push("Applied explicit prioritization criteria.");
  } else {
    notes.push("Consider naming the specific criteria you used to prioritize.");
  }

  if (AI_USAGE_SIGNALS.some((s) => text.includes(s))) {
    score += 15;
    notes.push("Described how AI was used in the workflow.");
  } else {
    notes.push("Be explicit about where and how you'd use AI in this task.");
  }

  if (RISK_SIGNALS.some((s) => text.includes(s))) {
    score += 15;
    notes.push("Included a human review or verification checkpoint — good practice.");
  } else {
    notes.push("Add a verification step before acting on AI output.");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, feedback: notes.join(" ") };
}
