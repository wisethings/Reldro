import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Rocket, ListChecks, FileText, Sparkles, GitBranch, Link2, ListOrdered, ShieldAlert, GraduationCap, CheckSquare, Users, BookOpen, LifeBuoy } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { ProgressBar } from "@/components/ui/Progress";
import { adoptWorkflow, toggleWorkflowStep } from "@/lib/actions/workflows";
import { RequestExpertHelpForm } from "@/components/specialists/RequestExpertHelpForm";
import { CopyPromptButton } from "@/components/workflows/CopyPromptButton";
import { StepMedia } from "@/components/workflows/StepMedia";
import { WorkflowLifecycleControls } from "@/components/workflows/WorkflowLifecycleControls";
import { WorkflowAssigneeControl } from "@/components/workflows/WorkflowAssigneeControl";
import { ChecklistItemCheckbox } from "@/components/workflows/ChecklistItemCheckbox";
import { getWorkflowDeploymentStats, getEligibleEmployeesForWorkflow } from "@/lib/queries/workflowDeployment";
import { getWorkflowReadiness } from "@/lib/queries/workflowReadiness";
import { getMatchedTools } from "@/lib/queries/tools";
import { getLinkedWorkflows, getWorkflowDependencies, getDependentWorkflows, getWorkflowChoices } from "@/lib/queries/workflowRelations";
import { WorkflowRelationManager } from "@/components/workflows/WorkflowRelationManager";
import { getWorkflowTimeSavedStats } from "@/lib/queries/timeSaved";
import { LogTimeSavedPrompt } from "@/components/workflows/LogTimeSavedPrompt";
import { WORKING_DAYS_PER_MONTH } from "@/lib/opportunities/generate";
import { DeleteWorkflowButton } from "@/components/workflows/DeleteWorkflowButton";
import { WORKFLOW_STATUS_LABEL, WORKFLOW_STATUS_TONE } from "@/lib/workflowLifecycle";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  // A workflow is either the shared global catalog (organizationId null) or
  // a team-authored one scoped to its own org (see workflows/page.tsx's own
  // list query for the same rule) - without this filter, any org could load
  // any other org's private workflow (and its courses) just by guessing an
  // id, which is exactly what happened via the "linked workflow" link from a
  // project page.
  const [workflow, orgWorkflow, courses, completions, employee, org] = await Promise.all([
    prisma.workflow.findFirst({
      where: { id, OR: [{ organizationId: null }, { organizationId: session.organizationId }] },
      include: { steps: { orderBy: { order: "asc" } } },
    }),
    prisma.organizationWorkflow.findUnique({
      where: { organizationId_workflowId: { organizationId: session.organizationId, workflowId: id } },
    }),
    prisma.course.findMany({
      where: { workflowId: id, OR: [{ organizationId: null }, { organizationId: session.organizationId }] },
      include: { lessons: true },
    }),
    session.employeeId
      ? prisma.workflowStepCompletion.findMany({ where: { employeeId: session.employeeId, workflowStep: { workflowId: id } } })
      : Promise.resolve([]),
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
      : Promise.resolve(null),
    prisma.organization.findUnique({ where: { id: session.organizationId }, select: { blendedHourlyRate: true } }),
  ]);
  if (!workflow) notFound();
  const canRequestExpertHelp = session.role === "COMPANY_ADMIN" || Boolean(employee?.isDepartmentAdmin);
  const isDepartmentLeadHere = Boolean(employee?.isDepartmentAdmin && employee.department?.name === workflow.department);
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";

  const status = orgWorkflow?.status ?? "NOT_ADOPTED";
  const completedStepIds = new Set(completions.map((c) => c.workflowStepId));
  const completedCount = workflow.steps.filter((s) => completedStepIds.has(s.id)).length;

  const canManageOthersHere = isCompanyAdmin || isDepartmentLeadHere;
  // Only team-authored workflows are editable; the shared catalog is read-only.
  const canEditWorkflow = workflow.organizationId !== null && canManageOthersHere;
  const canManageChecklist =
    canManageOthersHere ||
    (session.employeeId !== null && (orgWorkflow?.ownerId === session.employeeId || orgWorkflow?.assigneeId === session.employeeId));

  const [stats, eligibleEmployees, readiness, matchedTools, checklistCompletions, linkedWorkflows, dependencies, dependentWorkflows, workflowChoices, timeSavedStats] =
    await Promise.all([
      getWorkflowDeploymentStats(session.organizationId, workflow),
      canManageOthersHere ? getEligibleEmployeesForWorkflow(session.organizationId, workflow.department) : Promise.resolve([]),
      getWorkflowReadiness(session.organizationId, workflow.id, workflow.department),
      getMatchedTools(session.organizationId, workflow.toolsRequired),
      prisma.workflowChecklistCompletion.findMany({ where: { organizationId: session.organizationId, workflowId: workflow.id } }),
      getLinkedWorkflows(session.organizationId, workflow.id),
      getWorkflowDependencies(session.organizationId, workflow.id),
      getDependentWorkflows(session.organizationId, workflow.id),
      getWorkflowChoices(session.organizationId, workflow.id),
      getWorkflowTimeSavedStats(session.organizationId, workflow.id, session.employeeId),
    ]);
  const checklistCompletionByIndex = new Map(checklistCompletions.map((c) => [c.itemIndex, c]));
  const unmetDependencies = dependencies.filter((d) => !d.met);
  const dependenciesMet = unmetDependencies.length === 0;
  const linkChoices = workflowChoices.filter((w) => !linkedWorkflows.some((l) => l.id === w.id));
  const dependencyChoices = workflowChoices.filter((w) => !dependencies.some((d) => d.id === w.id));
  const showTimeSavedPrompt =
    Boolean(session.employeeId) && workflow.steps.length > 0 && completedCount === workflow.steps.length && timeSavedStats.myMinutesSaved === null;

  // A real dollar figure, built only from measured inputs: the actual number
  // of people who've completed this workflow (not an assumed "12% of
  // headcount"), the average minutes they themselves reported saving (not
  // the catalog's flat guess), and this org's own hourly rate (not a single
  // number assumed for every customer). Only shown once there's at least
  // one real report to build it from.
  const measuredHoursSavedMonthly =
    timeSavedStats.reportCount > 0
      ? Math.round((timeSavedStats.avgMinutesSaved! * stats.activeAdopters * WORKING_DAYS_PER_MONTH) / 60)
      : null;
  const measuredAnnualValue =
    measuredHoursSavedMonthly !== null ? Math.round(measuredHoursSavedMonthly * 12 * (org?.blendedHourlyRate ?? 45)) : null;
  const checklistItems = [
    "Review current process with the team",
    "Confirm access to required tools",
    "Assign an owner for rollout",
    ...workflow.steps.slice(0, 3).map((s) => `Train employees on: ${s.title}`),
    "Measure adoption after 30 days",
  ];

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
          {canEditWorkflow && (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/workflows/manage/${workflow.id}`} className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">
                Edit
              </Link>
              <DeleteWorkflowButton workflowId={workflow.id} />
            </div>
          )}
          {dependenciesMet ? (
            <form action={adoptWorkflow.bind(null, workflow.id)}>
              <button className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
                {status === "ADOPTED" ? "Re-confirm adoption" : "Adopt workflow"}
              </button>
            </form>
          ) : (
            <div className="text-right">
              <button disabled className="cursor-not-allowed rounded-full bg-ink-200 px-4 py-2 text-sm font-medium text-ink-500">
                Adopt workflow
              </button>
              <p className="mt-1 text-xs text-ink-500">Requires first: {unmetDependencies.map((d) => d.title).join(", ")}</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={DIFFICULTY_TONE[workflow.difficulty]}>{workflow.difficulty.toLowerCase()} difficulty</Badge>
          <Badge>{workflow.skillLevel} skill level</Badge>
          <Badge tone={WORKFLOW_STATUS_TONE[status]}>{WORKFLOW_STATUS_LABEL[status]}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {timeSavedStats.reportCount > 0 ? (
          <Stat
            label="Time saved (measured)"
            value={`${timeSavedStats.avgMinutesSaved} min/day`}
            hint={`From ${timeSavedStats.reportCount} employee report${timeSavedStats.reportCount === 1 ? "" : "s"}`}
          />
        ) : (
          <Stat label="Time saved (estimated)" value={`${workflow.timeSavedMinutes} min/day`} hint="Not yet measured for your team" />
        )}
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
        <CardHeader
          icon={<IconBadge icon={<Rocket size={18} />} tone="orchid" />}
          title="Deployment"
          subtitle={stats.ownerName ? `Owned by ${stats.ownerName}` : "No owner assigned yet"}
        />
        <CardBody className="space-y-4">
          {session.role === "COMPANY_ADMIN" && (
            <WorkflowLifecycleControls
              workflowId={workflow.id}
              currentStatus={status}
              currentOwnerId={orgWorkflow?.ownerId ?? null}
              eligibleEmployees={eligibleEmployees.map((e) => ({ id: e.id, name: e.user.name }))}
              dependenciesMet={dependenciesMet}
              unmetDependencyTitles={unmetDependencies.map((d) => d.title)}
            />
          )}
          <WorkflowAssigneeControl
            workflowId={workflow.id}
            currentAssigneeId={orgWorkflow?.assigneeId ?? null}
            currentAssigneeName={stats.assigneeName}
            myEmployeeId={session.employeeId ?? null}
            canManageOthers={canManageOthersHere}
            eligibleEmployees={eligibleEmployees.map((e) => ({ id: e.id, name: e.user.name }))}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Adoption" value={`${stats.adoptionPct}% (${stats.activeAdopters}/${stats.eligibleEmployees})`} />
            <Stat label="Completion rate" value={`${stats.completionRatePct}%`} />
            {measuredAnnualValue !== null ? (
              <Stat
                label="Measured value"
                value={`$${Math.round(measuredAnnualValue / 1000)}k/yr`}
                hint={`From ${timeSavedStats.reportCount} employee report${timeSavedStats.reportCount === 1 ? "" : "s"}`}
              />
            ) : (
              stats.estAnnualValue !== null && (
                <Stat label="Estimated value" value={`$${Math.round(stats.estAnnualValue / 1000)}k/yr`} hint="Not yet measured for your team" />
              )
            )}
            <Stat label="Captured value" value={`$${Math.round(stats.capturedValue / 1000)}k/yr`} />
            <Stat label="Time saved" value={`${measuredHoursSavedMonthly ?? stats.hoursSavedMonthly} hrs/mo`} />
            <Stat label="Last activity" value={stats.lastActivityAt ? stats.lastActivityAt.toLocaleDateString() : "No activity yet"} />
          </div>
        </CardBody>
      </Card>

      {(dependencies.length > 0 || canManageOthersHere) && (
        <Card>
          <CardHeader
            icon={<IconBadge icon={<ListChecks size={18} />} tone="coral" />}
            title="Prerequisites"
            subtitle={dependencies.length > 0 ? "This workflow shouldn't be adopted until these are." : "Workflows that must be adopted first, if any."}
          />
          <CardBody>
            <WorkflowRelationManager
              mode="dependency"
              workflowId={workflow.id}
              items={dependencies}
              choices={dependencyChoices}
              canManage={canManageOthersHere}
            />
            {canManageOthersHere && dependentWorkflows.length > 0 && (
              <p className="mt-3 text-xs text-ink-500">
                Blocks: {dependentWorkflows.map((d) => d.title).join(", ")}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader icon={<IconBadge icon={<FileText size={18} />} tone="sage" />} title="Current process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.currentProcess}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<IconBadge icon={<Sparkles size={18} />} tone="orchid" />} title="AI-enabled process" />
          <CardBody>
            <p className="text-sm text-ink-700">{workflow.aiProcess}</p>
          </CardBody>
        </Card>
      </div>

      {workflow.steps.length > 0 && (
        <Card>
          <CardHeader icon={<IconBadge icon={<GitBranch size={18} />} tone="olive" />} title="Process chain" subtitle="AI actions and human checkpoints, in order" />
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

      {(linkedWorkflows.length > 0 || canManageOthersHere) && (
        <Card>
          <CardHeader icon={<IconBadge icon={<Link2 size={18} />} tone="sage" />} title="Related workflows" subtitle="Other workflows worth knowing about alongside this one." />
          <CardBody>
            <WorkflowRelationManager
              mode="link"
              workflowId={workflow.id}
              items={linkedWorkflows}
              choices={linkChoices}
              canManage={canManageOthersHere}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          icon={<IconBadge icon={<ListOrdered size={18} />} tone="orchid" />}
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
                  <StepMedia imageUrl={step.imageUrl} videoUrl={step.videoUrl} title={step.title} />
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

      {showTimeSavedPrompt && <LogTimeSavedPrompt workflowId={workflow.id} />}

      {(workflow.securityNotes || workflow.trainingNotes) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workflow.securityNotes && (
            <Card>
              <CardHeader icon={<IconBadge icon={<ShieldAlert size={18} />} tone="coral" />} title="Security considerations" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.securityNotes}</p>
              </CardBody>
            </Card>
          )}
          {workflow.trainingNotes && (
            <Card>
              <CardHeader icon={<IconBadge icon={<GraduationCap size={18} />} tone="olive" />} title="Training requirements" />
              <CardBody>
                <p className="text-sm text-ink-700">{workflow.trainingNotes}</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader
          icon={<IconBadge icon={<CheckSquare size={18} />} tone="sage" />}
          title="Implementation checklist"
          subtitle={`${checklistCompletionByIndex.size} of ${checklistItems.length} done`}
        />
        <CardBody>
          <ul className="space-y-2">
            {checklistItems.map((item, i) => {
              const completion = checklistCompletionByIndex.get(i);
              return (
                <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
                  <ChecklistItemCheckbox
                    workflowId={workflow.id}
                    itemIndex={i}
                    completed={Boolean(completion)}
                    completedByName={completion?.completedByName ?? null}
                    canToggle={canManageChecklist}
                  />
                  <span className={completion ? "text-ink-400 line-through" : undefined}>{item}</span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {courses.length > 0 && (
        <Card>
          <CardHeader
            icon={<IconBadge icon={<Users size={18} />} tone="orchid" />}
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
          <CardHeader icon={<IconBadge icon={<BookOpen size={18} />} tone="olive" />} title="Recommended learning" />
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

      {workflow.difficulty === "HIGH" && canRequestExpertHelp && (
        <Card>
          <CardHeader icon={<IconBadge icon={<LifeBuoy size={18} />} tone="coral" />} title="Consider expert help" subtitle="High-complexity workflows implement faster with outside expertise" />
          <CardBody>
            <RequestExpertHelpForm workflowId={workflow.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}
