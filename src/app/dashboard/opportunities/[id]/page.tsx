import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { RequestExpertHelpForm } from "@/components/specialists/RequestExpertHelpForm";
import { computePriorityScore, computeEffortScore, opportunityQuadrant, QUADRANT_LABELS } from "@/lib/scoring";

const IMPACT_TONE = { LOW: "neutral", MEDIUM: "amber", HIGH: "green" } as const;
const COMPLEXITY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const opportunity = await prisma.opportunity.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { department: true, workflow: { include: { steps: true } } },
  });
  if (!opportunity) notFound();

  const courses = opportunity.workflow
    ? await prisma.course.findMany({ where: { workflowId: opportunity.workflow.id }, include: { lessons: true } })
    : [];

  const priority = computePriorityScore(opportunity);
  const effort = computeEffortScore(opportunity.complexity, opportunity.riskScore);
  const quadrant = opportunityQuadrant(opportunity);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/opportunities" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← All opportunities
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{opportunity.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{opportunity.department?.name ?? "Cross-functional"}</p>
          </div>
          <div className="flex gap-1.5">
            <Badge tone={IMPACT_TONE[opportunity.impact]}>{opportunity.impact.toLowerCase()} impact</Badge>
            <Badge tone={COMPLEXITY_TONE[opportunity.complexity]}>{opportunity.complexity.toLowerCase()} complexity</Badge>
            <Badge>{opportunity.status.replace("_", " ").toLowerCase()}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Priority score" value={`${priority}/100`} />
        <Stat label="Effort score" value={`${effort}/100`} />
        <Stat label="Hours saved / mo" value={opportunity.estHoursSavedMonthly.toLocaleString()} />
        <Stat label="Est. annual value" value={`$${(opportunity.estAnnualValue / 1000).toFixed(0)}k`} />
      </div>

      <Card>
        <CardHeader title="Current process" />
        <CardBody>
          <p className="text-sm text-ink-700">{opportunity.currentProcess}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="AI opportunity" />
        <CardBody>
          <p className="text-sm text-ink-700">{opportunity.aiOpportunity}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {opportunity.toolsRequired.map((t) => (
              <Badge key={t} tone="blue">
                {t}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Prioritization" subtitle={QUADRANT_LABELS[quadrant]} />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreCell label="Business impact" value={opportunity.businessImpactScore} />
            <ScoreCell label="Adoption potential" value={opportunity.adoptionPotentialScore} />
            <ScoreCell label="Frequency" value={opportunity.frequencyScore} />
            <ScoreCell label="Risk" value={opportunity.riskScore} />
          </div>
        </CardBody>
      </Card>

      {opportunity.workflow && (
        <Card>
          <CardHeader
            title="Recommended action"
            subtitle="Start with training, then implement the workflow"
            action={
              <LinkButton href={`/dashboard/workflows/${opportunity.workflow.id}`} size="sm">
                Explore workflow
              </LinkButton>
            }
          />
          <CardBody>
            <p className="text-sm text-ink-700">{opportunity.workflow.summary}</p>
            {courses.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-ink-500">Recommended learning</p>
                <ul className="mt-1.5 space-y-1">
                  {courses.map((c) => (
                    <li key={c.id}>
                      <Link href={`/dashboard/learn?course=${c.id}`} className="text-sm text-brand-700 hover:text-brand-800">
                        {c.title} · {c.lessons.length} lessons
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {opportunity.recommendedSpecialist && (
        <Card>
          <CardHeader title="Specialist recommended" subtitle="This opportunity is complex enough to benefit from outside expertise" />
          <CardBody>
            <RequestExpertHelpForm opportunityId={opportunity.id} workflowId={opportunity.workflowId ?? undefined} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="text-base font-semibold text-ink-900">{value}</p>
    </div>
  );
}
