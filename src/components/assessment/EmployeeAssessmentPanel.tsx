"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Gauge, BarChart3, Target } from "lucide-react";
import { ScoreRing, ProgressBar } from "@/components/ui/Progress";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { LikertAssessmentForm } from "./LikertAssessmentForm";
import { EMPLOYEE_ASSESSMENT_QUESTIONS } from "@/lib/data/assessment-questions";
import { EMPLOYEE_SKILL_LABELS, type EmployeeSkillCategory } from "@/lib/scoring";
import { EMPLOYEE_SKILL_ICON } from "@/lib/data/assessmentIcons";
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
        <CardHeader
          icon={<IconBadge icon={<BarChart3 size={18} />} tone="orchid" />}
          title="AI skills assessment"
          subtitle="Rate how much you agree with each statement. This helps identify what to learn next."
        />
        <CardBody>
          <LikertAssessmentForm
            questions={EMPLOYEE_ASSESSMENT_QUESTIONS}
            categoryIcon={EMPLOYEE_SKILL_ICON}
            categoryLabel={EMPLOYEE_SKILL_LABELS}
            subjectLabel="me"
            measuresDescription="This assessment evaluates your AI fluency across five skills: fundamentals, prompting, redesigning workflows around AI, evaluating AI output, and using automation."
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
          <IconBadge icon={<Gauge size={18} />} tone="orchid" className="mx-auto" />
          <p className="mt-2 text-xs font-medium text-ink-500">Your AI Fluency</p>
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
        <CardHeader icon={<IconBadge icon={<BarChart3 size={18} />} tone="sage" />} title="Skill breakdown" />
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
        <CardBody className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconBadge icon={<Target size={18} />} tone="coral" />
            <div>
              <p className="text-sm font-medium text-ink-900">Your biggest opportunity: {EMPLOYEE_SKILL_LABELS[weakest]}</p>
              <p className="text-xs text-ink-500">We'll prioritize learning here.</p>
            </div>
          </div>
          <Link href="/dashboard/learn" className="text-xs font-medium text-orchid-deep hover:text-oxblood">
            View recommended learning →
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
