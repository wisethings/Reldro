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
import { STATUS_LABEL, getBiggestConstraints, type DimensionDiagnostic, type DimensionStatus } from "@/lib/diagnostics-shared";

const STATUS_TONE: Record<DimensionStatus, "green" | "brand" | "amber" | "red"> = {
  strong: "green",
  developing: "brand",
  "needs-attention": "amber",
  critical: "red",
};

export function OrgAssessmentPanel({
  overallScore,
  breakdown,
  completedAt,
  history,
  diagnostics,
}: {
  overallScore: number;
  breakdown: Record<OrgMaturityCategory, number>;
  completedAt: string | null;
  history: { date: string; score: number }[];
  diagnostics: DimensionDiagnostic[];
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

      {diagnostics.length > 0 && (
        <Card>
          <CardHeader title="Why is our score this way?" subtitle="What's pulling the score up or down" />
          <CardBody className="space-y-5">
            <div className="space-y-2">
              {diagnostics
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((d) => (
                  <div key={d.category} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-ink-700">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink-900">{d.score}</span>
                      <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    </div>
                  </div>
                ))}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Biggest constraints</p>
              <div className="mt-2 space-y-3">
                {getBiggestConstraints(diagnostics, 2).map((d, i) => (
                  <div key={d.category} className="rounded-lg bg-surface-sunken p-3">
                    <p className="text-sm font-medium text-ink-900">
                      {i + 1}. {d.label}: {d.score}/100
                    </p>
                    <p className="mt-1 text-sm text-ink-600">{d.meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Recommended next steps</p>
              <ul className="mt-2 space-y-1.5">
                {getBiggestConstraints(diagnostics, 3).map((d) => (
                  <li key={d.category} className="flex items-start gap-2 text-sm text-ink-700">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                    {d.recommendedAction}
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      )}

      {diagnostics.length > 0 && (
        <Card>
          <CardHeader title="Diagnostic breakdown" subtitle="What each dimension means, and what to do about it" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {diagnostics.map((d) => (
              <div key={d.category} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-900">{d.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">{d.score} / 100</span>
                    <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  </div>
                </div>
                <ProgressBar value={d.score} tone={STATUS_TONE[d.status]} />
                <p className="text-sm text-ink-600">{d.meaning}</p>
                <div className="flex flex-wrap gap-1.5">
                  {d.evidence.map((e) => (
                    <Badge key={e} tone="neutral">{e}</Badge>
                  ))}
                </div>
                <p className="text-xs text-ink-500">
                  <span className="font-medium text-ink-700">Recommended action: </span>
                  {d.recommendedAction}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

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
