import type { WorkflowAdoptionStatus } from "@prisma/client";

/**
 * The full workflow deployment lifecycle: Learn -> Practice -> Pilot ->
 * Deploy -> Adopt -> Optimize -> Measure, expressed as OrganizationWorkflow
 * status transitions. Single source of truth for ordering, labels, and
 * badge tones so every page (list, detail, recommendations, value capture)
 * agrees on what each stage means.
 */
export const WORKFLOW_STATUS_ORDER: WorkflowAdoptionStatus[] = [
  "NOT_ADOPTED",
  "LEARNING",
  "PILOT",
  "IN_PROGRESS",
  "ADOPTED",
  "OPTIMIZING",
  "COMPLETE",
];

export const WORKFLOW_STATUS_LABEL: Record<WorkflowAdoptionStatus, string> = {
  NOT_ADOPTED: "Not started",
  LEARNING: "Learning",
  PILOT: "Pilot",
  IN_PROGRESS: "In progress",
  ADOPTED: "Adopted",
  OPTIMIZING: "Optimizing",
  COMPLETE: "Complete",
};

export const WORKFLOW_STATUS_TONE: Record<WorkflowAdoptionStatus, "neutral" | "blue" | "amber" | "green" | "brand"> = {
  NOT_ADOPTED: "neutral",
  LEARNING: "blue",
  PILOT: "blue",
  IN_PROGRESS: "amber",
  ADOPTED: "green",
  OPTIMIZING: "brand",
  COMPLETE: "green",
};

/**
 * Statuses at which a workflow counts as genuinely deployed - i.e. its
 * linked opportunity's value counts as "captured" rather than "potential",
 * and it counts toward "workflows deployed" everywhere that's shown. Once a
 * workflow is optimizing or complete it's still deployed, so those count
 * too - only earlier stages (learning/pilot/in-progress) don't yet.
 */
export const DEPLOYED_STATUSES: WorkflowAdoptionStatus[] = ["ADOPTED", "OPTIMIZING", "COMPLETE"];
