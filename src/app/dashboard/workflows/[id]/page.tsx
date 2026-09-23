import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { adoptWorkflow, toggleWorkflowStep } from "@/lib/actions/workflows";
import { RequestExpertHelpForm } from "@/components/specialists/RequestExpertHelpForm";
import { CopyPromptButton } from "@/components/workflows/CopyPromptButton";
import { WorkflowLifecycleControls } from "@/components/workflows/WorkflowLifecycleControls";
import { getWorkflowDeploymentStats, getEligibleEmployeesForWorkflow } from "@/lib/queries/workflowDeployment";
import { getWorkflowReadiness } from "@/lib/queries/workflowReadiness";
import { getMatchedTools } from "@/lib/queries/tools";
import { WORKFLOW_STATUS_LABEL, WORKFLOW_STATUS_TONE } from "@/lib/workflowLifecycle";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const [workflow, orgWorkflow, courses, completions] = await Promise.all([
    prisma.workflow.findUnique({ where: { id }, include: { steps: { orderBy: { order: "asc" } } } }),
    prisma.organizationWorkflow.findUnique({
      where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId: id } },
    }),
    prisma.course.findMany({ where: { workflowId: id }, include: { lessons: true } }),
    session.employeeId
      ? prisma.workflowStepCompletion.findMany({ where: { employeeId: session.employeeId, workflowStep: { workflowId: id } } })
      : Promise.resolve([]),
  ]);
  if (!workflow) notFound();

  const status = orgWorkflow?.status ?? "NOT_ADOPTED";
  const completedStepIds = new Set(completions.map((c) => c.workflowStepId));
  const completedCount = workflow.steps.filter((s) => completedStepIds.has(s.id)).length;

  const [stats, eligibleEmployees, readiness, matchedTools] = await Promise.all([
    getWorkflowDeploymentStats(session.organizationId, workflow),
    session.role === "COMPANY_ADMIN" ? getEligibleEmployeesForWorkflow(session.organizationId, workflow.department) : Promise.resolve([]),
    getWorkflowReadiness(session.organizationId, workflow.id, workflow.department),
    getMatchedTools(session.organizationId, workflow.toolsRequired),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/workflows" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Workflow library
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{workflow.title}</h1>
            <p className="mt-1 text-sm text-ink-500">{workflow.department}</p>
          </div>
          <form action={adoptWorkflow.bind(null, workflow.id)}>
            <button className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              {status === "ADOPTED" ? "Re-confirm adoption" : "Adopt workflow"}
            </button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={DIFFICULTY_TONE[workflow.difficulty]}>{workflow.difficulty.toLowerCase()} difficulty</Badge>
          <Badge>{workflow.skillLevel} skill level</Badge>
          <Badge tone={WORKFLOW_STATUS_TONE[status]}>{WORKFLOW_STATUS_LABEL[status]}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Time saved" value={`${workflow.timeSavedMinutes} min/day`} />
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-xs text-ink-500">Tools required</p>
          {workflow.toolsRequired.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {workflow.toolsRequired.map((toolName) =>
                matchedTools.has(toolName) ? (
                  <Link key={toolName} href={`/dashboard/integrations/tools/${matchedTools.get(toolName)}`}>
                    <Badge tone="brand">{toolName}</Badge>
                  </Link>
                ) : (
                  <Badge key={toolName}>{toolName}</Badge>
                )
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold text-ink-900">None</p>
          )}
        </div>
        <Stat label="Skills required" value={workflow.skillsRequired.join(", ") || "AI fundamentals"} />
      </div>

      <Card>
        <CardHeader title="Deployment" subtitle={stats.ownerName ? `Owned by ${stats.ownerName}` : "No owner assigned yet"} />
        <CardBody className="space-y-4">
          {session.role === "COMPANY_ADMIN" && (
            <WorkflowLifecycleControls
              workflowId={workflow.id}
              currentStatus={status}
              currentOwnerId={orgWorkflow?.ownerId ?? null}
              eligibleEmployees={eligibleEmployees.map((e) => ({ id: e.id, name: e.user.name }))}
            />
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Adoption" value={`${stats.adoptionPct}% (${stats.activeAdopters}/${stats.eligibleEmployees})`} />
            <Stat label="Completion rate" value={`${stats.completionRatePct}%`} />
            {stats.estAnnualValue !== null && <Stat label="Estimated value" value={`$${Math.round(stats.estAnnualValue / 1000)}k/yr`} />}
            <Stat label="Captured value" value={`$${Math.round(stats.capturedValue / 1000)}k/yr`} />
            <Stat label="Time saved" value={`${stats.hoursSavedMonthly} hrs/mo`} />
            <Stat label="Last activity" value={stats.lastActivityAt ? stats.lastActivityAt.toLocaleDateString() : "No activity yet"} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Current process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.currentProcess}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="AI-enabled process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.aiProcess}</p>
          </CardBody>
        </Card>
      </div>

      {workflow.steps.length > 0 && (
        <Card>
          <CardHeader title="Process chain" subtitle="AI actions and human checkpoints, in order" />
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              {workflow.steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  <Badge tone={step.humanCheckpoint ? "amber" : "brand"}>
                    {step.humanCheckpoint ? "Human review" : "AI"}: {step.title}
                  </Badge>
                  {i < workflow.steps.length - 1 && <span className="text-ink-400">→</span>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Step-by-step process"
          subtitle={session.employeeId ? `${completedCount} of ${workflow.steps.length} steps completed` : undefined}
        />
        {session.employeeId && (
          <div className="px-5 pt-4">
            <ProgressBar value={completedCount} max={workflow.steps.length} tone="green" />
          </div>
        )}
        <CardBody className="space-y-4 p-0 divide-y divide-ink-200">
          {workflow.steps.map((step) => {
            const done = completedStepIds.has(step.id);
            return (
              <div key={step.id} className="flex gap-4 px-5 py-4">
                {session.employeeId ? (
                  <form action={toggleWorkflowStep.bind(null, step.id, workflow.id)}>
                    <button
                      type="submit"
                      title={done ? "Mark as not done" : "Mark as done"}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                        done ? "bg-sage-deep text-white" : "bg-ink-100 text-ink-700 hover:bg-surface-sunken"
                      }`}
                    >
                      {done ? "✓" : step.order}
                    </button>
                  </form>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                    {step.order}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${done ? "text-ink-400 line-through" : "text-ink-900"}`}>{step.title}</p>
                    {step.humanCheckpoint && <Badge tone="amber">Human checkpoint</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-600">{step.description}</p>
                  {step.aiPrompt && (
                    <div className="mt-2 rounded-lg bg-ink-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Example AI prompt</p>
                        <CopyPromptButton prompt={step.aiPrompt} workflowStepId={step.id} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-ink-700">{step.aiPrompt}</p>
                    </div>
                  )}
                  {courses[0] && (
                    <div className="mt-2 text-xs font-medium text-orchid-deep">
                      <Link href={`/dashboard/learn?course=${courses[0].id}`}>Learn the concepts behind this step →</Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {(workflow.securityNotes || workflow.trainingNotes) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workflow.securityNotes && (
            <Card>
              <CardHeader title="Security considerations" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.securityNotes}</p>
              </CardBody>
            </Card>
          )}
          {workflow.trainingNotes && (
            <Card>
              <CardHeader title="Training requirements" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.trainingNotes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Implementation checklist" />
        <CardBody>
          <ul className="space-y-2">
            {["Review current process with the team", "Confirm access to required tools", "Assign an owner for rollout", ...workflow.steps.slice(0, 3).map((s) => `Train employees on: ${s.title}`), "Measure adoption after 30 days"].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ink-300" />
                {item}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {courses.length > 0 && (
        <Card>
          <CardHeader
            title="Team readiness"
            subtitle={`${readiness.totalLessons} required lesson${readiness.totalLessons === 1 ? "" : "s"} · ~${readiness.estimatedMinutesPerEmployee} min per employee`}
          />
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-700">Ready</span>
              <span className="font-medium text-ink-900">{readiness.readyCount} / {readiness.eligibleEmployees}</span>
            </div>
            <ProgressBar value={readiness.readyCount} max={readiness.eligibleEmployees || 1} tone="green" />
            {session.role === "COMPANY_ADMIN" && readiness.employeesNeedingTraining.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-500">Need training</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {readiness.employeesNeedingTraining.map((e) => (
                    <Badge key={e.id} tone="amber">{e.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Link
              href={`/dashboard/learn?course=${courses[0].id}`}
              className="inline-block rounded-full bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800"
            >
              Prepare team →
            </Link>
          </CardBody>
        </Card>
      )}

      {courses.length > 0 && (
        <Card>
          <CardHeader title="Recommended learning" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {courses.map((c) => (
              <Link key={c.id} href={`/dashboard/learn?course=${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                <span className="text-sm font-medium text-ink-900">{c.title}</span>
                <span className="text-xs text-ink-500">{c.lessons.length} lessons</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {workflow.difficulty === "HIGH" && (
        <Card>
          <CardHeader title="Consider expert help" subtitle="High-complexity workflows implement faster with outside expertise" />
          <CardBody>
            <RequestExpertHelpForm workflowId={workflow.id} />
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
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
