"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScoreRing, ProgressBar } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LikertAssessmentForm } from "./LikertAssessmentForm";
import { ORG_ASSESSMENT_QUESTIONS } from "@/lib/data/assessment-questions";
import { ORG_MATURITY_LABELS, maturityBand, type OrgMaturityCategory } from "@/lib/scoring";
import { submitOrgAssessment } from "@/lib/actions/assessment";

export function OrgAssessmentPanel({
  overallScore,
  breakdown,
  completedAt,
  history,
}: {
  overallScore: number;
  breakdown: Record<OrgMaturityCategory, number>;
  completedAt: string | null;
  history: { date: string; score: number }[];
}) {
  const [mode, setMode] = useState<"view" | "retake">("view");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const band = maturityBand(overallScore);

  if (mode === "retake") {
    return (
      <Card>
        <CardHeader title="Retake AI maturity assessment" subtitle="Rate your organization today" />
        <CardBody>
          <LikertAssessmentForm
            questions={ORG_ASSESSMENT_QUESTIONS}
            pending={pending}
            onSubmit={(responses) =>
              startTransition(async () => {
                await submitOrgAssessment(responses);
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
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <ScoreRing value={overallScore} size={130} label="/ 100" />
            <Badge tone="brand" className="mt-3">
              {band.label}
            </Badge>
            <p className="mt-2 text-xs text-ink-500">{band.description}</p>
            {completedAt && <p className="mt-3 text-[11px] text-ink-400">Last assessed {completedAt}</p>}
            <button
              onClick={() => setMode("retake")}
              className="mt-4 w-full rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
            >
              Retake assessment
            </button>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Maturity breakdown" subtitle="Weighted into your overall AI Adoption Score" />
          <CardBody className="space-y-4">
            {(Object.keys(breakdown) as OrgMaturityCategory[]).map((cat) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{ORG_MATURITY_LABELS[cat]}</span>
                  <span className="font-medium text-ink-900">{breakdown[cat]}</span>
                </div>
                <ProgressBar value={breakdown[cat]} className="mt-1.5" />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {history.length > 1 && (
        <Card>
          <CardHeader title="Assessment history" />
          <CardBody>
            <div className="divide-y divide-ink-200">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-600">{h.date}</span>
                  <span className="font-medium text-ink-900">{h.score}/100</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
