import type { InitiativeStatus } from "@prisma/client";

export const INITIATIVE_STATUS_LABEL: Record<InitiativeStatus, string> = {
  PLANNED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
};

export const INITIATIVE_STATUS_TONE: Record<InitiativeStatus, "neutral" | "blue" | "green" | "amber"> = {
  PLANNED: "neutral",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  ON_HOLD: "amber",
};
