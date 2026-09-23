import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SimulationRunner } from "@/components/learning/SimulationRunner";
import { AudioNarration } from "@/components/learning/AudioNarration";
import { ensureSimulationCatalog } from "@/lib/queries/simulations";
import type { DecisionOption, AiOutputIssue } from "@/lib/simulationCatalog";
import type { SimulationDimensions } from "@/lib/ai/simulationEvaluator";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  await ensureSimulationCatalog();

  const simulation = await prisma.simulation.findUnique({ where: { id } });
  if (!simulation) notFound();

  const pastAttempts = session.employeeId
    ? await prisma.simulationAttempt.findMany({
        where: { employeeId: session.employeeId, simulationId: id },
        orderBy: { completedAt: "asc" },
      })
    : [];

  const decisionOptions = simulation.decisionOptions as unknown as DecisionOption[];
  const aiOutputIssues = simulation.aiOutputIssues as unknown as AiOutputIssue[];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard/learn" className="text-xs font-medium text-ink-500 hover:text-ink-800">
        ← Back to Learn
      </Link>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-orchid-deep">{simulation.department} simulation</p>
          <Badge tone={DIFFICULTY_TONE[simulation.difficulty]}>{simulation.difficulty.toLowerCase()}</Badge>
          {simulation.timeLimitMinutes && <Badge tone="neutral">{simulation.timeLimitMinutes} min</Badge>}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">{simulation.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{simulation.description}</p>
      </div>

      <Card>
        <CardHeader title="Briefing" action={<AudioNarration text={simulation.scenario} label="Listen to briefing" />} />
        <CardBody className="space-y-3 text-sm">
          <p className="text-ink-700 whitespace-pre-line">{simulation.scenario}</p>
          <dl className="grid gap-3 border-t border-ink-200 pt-3 sm:grid-cols-2">
            {simulation.role && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Your role</dt>
                <dd className="text-ink-800">{simulation.role}</dd>
              </div>
            )}
            {simulation.objective && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Objective</dt>
                <dd className="text-ink-800">{simulation.objective}</dd>
              </div>
            )}
            {simulation.availableTools.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Available tools</dt>
                <dd className="text-ink-800">{simulation.availableTools.join(", ")}</dd>
              </div>
            )}
            {simulation.workflowNote && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Approved workflow</dt>
                <dd className="text-ink-800">{simulation.workflowNote}</dd>
              </div>
            )}
            {simulation.companyPolicy && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Company policy</dt>
                <dd className="text-ink-800">{simulation.companyPolicy}</dd>
              </div>
            )}
            {simulation.constraints && (
              <div>
                <dt className="text-xs font-medium text-ink-500">Constraints</dt>
                <dd className="text-ink-800">{simulation.constraints}</dd>
              </div>
            )}
            {simulation.successCriteria && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-ink-500">What good looks like</dt>
                <dd className="text-ink-800">{simulation.successCriteria}</dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>

      {session.employeeId ? (
        <Card>
          <CardHeader title="Your response" />
          <CardBody>
            <SimulationRunner
              simulationId={simulation.id}
              decisionPrompt={simulation.decisionPrompt}
              decisionOptions={decisionOptions.map((o) => ({ id: o.id, label: o.label }))}
              aiOutputSample={simulation.aiOutputSample}
              aiOutputIssues={aiOutputIssues.map((i) => ({ id: i.id, label: i.label }))}
              reasoningPrompt={simulation.scenario}
              pastAttempts={pastAttempts.map((a) => ({
                id: a.id,
                score: a.score,
                passed: a.passed,
                completedAt: a.completedAt.toISOString(),
                dimensions: a.dimensions as unknown as SimulationDimensions,
              }))}
            />
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-ink-500">Sign in as an employee to attempt this simulation.</p>
      )}

      {pastAttempts.length > 0 && (
        <Card>
          <CardHeader title="Past attempts" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {[...pastAttempts].reverse().map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink-900">
                    {a.score}/100 {a.passed && <span className="text-sage-deep">· Passed</span>}
                  </span>
                  <span className="text-ink-400">{a.completedAt.toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-ink-600">{a.feedback}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
