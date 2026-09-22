"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScoreRing, ProgressBar } from "@/components/ui/Progress";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LikertAssessmentForm } from "./LikertAssessmentForm";
import { EMPLOYEE_ASSESSMENT_QUESTIONS } from "@/lib/data/assessment-questions";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";
import { submitEmployeeAssessment } from "@/lib/actions/assessment";

export function EmployeeAssessmentPanel({
  overallScore,
  breakdown,
  completedAt,
  hasAssessment,
}: {
  overallScore: number;
  breakdown: Record<EmployeeSkillCategory, number>;
  completedAt: string | null;
  hasAssessment: boolean;
}) {
  const [mode, setMode] = useState<"view" | "retake">(hasAssessment ? "view" : "retake");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const weakest = (Object.keys(breakdown) as EmployeeSkillCategory[]).sort((a, b) => breakdown[a] - breakdown[b])[0];

  if (mode === "retake") {
    return (
      <Card>
        <CardHeader title="AI skills assessment" subtitle="Rate how much you agree with each statement" />
        <CardBody>
          <LikertAssessmentForm
            questions={EMPLOYEE_ASSESSMENT_QUESTIONS}
            pending={pending}
            onSubmit={(responses) =>
              startTransition(async () => {
                await submitEmployeeAssessment(responses);
                setMode("view");
                router.refresh();
              })
            }
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-col items-center text-center">
          <p className="text-xs font-medium text-ink-500">Your AI Fluency</p>
          <div className="mt-2">
            <ScoreRing value={overallScore} size={130} label="/ 100" />
          </div>
          {completedAt && <p className="mt-3 text-[11px] text-ink-400">Last assessed {completedAt}</p>}
          <button
            onClick={() => setMode("retake")}
            className="mt-4 rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            Retake assessment
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Skill breakdown" />
        <CardBody className="space-y-4">
          {(Object.keys(breakdown) as EmployeeSkillCategory[]).map((cat) => (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{EMPLOYEE_SKILL_LABELS[cat]}</span>
                <span className="font-medium text-ink-900">{breakdown[cat]}</span>
              </div>
              <ProgressBar value={breakdown[cat]} className="mt-1.5" />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-900">Your biggest opportunity: {EMPLOYEE_SKILL_LABELS[weakest]}</p>
            <p className="text-xs text-ink-500">We'll prioritize learning here.</p>
          </div>
          <Link href="/dashboard/learn" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
            View recommended learning →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
