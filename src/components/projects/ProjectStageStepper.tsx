"use client";

import { useTransition } from "react";
import { advanceProjectStage } from "@/lib/actions/marketplace";

const STAGES = ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"] as const;
type Stage = (typeof STAGES)[number];

const LABELS: Record<Stage, string> = {
  DISCOVERY: "Discovery",
  WORKFLOW_DESIGN: "Workflow Design",
  IMPLEMENTATION: "Implementation",
  TRAINING: "Training",
  LAUNCH: "Launch",
  MEASUREMENT: "Measurement",
  OPTIMIZATION: "Optimization",
};

export function ProjectStageStepper({
  projectId,
  currentStage,
  canAdvance,
}: {
  projectId: string;
  currentStage: Stage;
  canAdvance: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center overflow-x-auto pb-1 scrollbar-thin">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={stage} className="flex shrink-0 items-center">
            <button
              disabled={!canAdvance || pending}
              onClick={() => startTransition(() => advanceProjectStage(projectId, stage))}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-center ${canAdvance ? "cursor-pointer hover:bg-ink-50" : ""}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "bg-sage text-sage-deep" : active ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-500"
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-[11px] font-medium ${active ? "text-ink-900" : "text-ink-500"}`}>{LABELS[stage]}</span>
            </button>
            {i < STAGES.length - 1 && <span className="h-px w-6 shrink-0 bg-ink-200" />}
          </div>
        );
      })}
    </div>
  );
}
