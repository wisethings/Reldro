import "server-only";
import { prisma } from "@/lib/prisma";
import { getFluencyForEmployee, type EmployeeFluency } from "@/lib/queries/fluency";
import { getWorkflowDeploymentStatsForOrg } from "@/lib/queries/workflowDeployment";
import { getCapabilityLevel, type CapabilityLevel } from "@/lib/employeeCapability";

export type EmployeeAiProfile = {
  fluency: EmployeeFluency | null;
  capabilityLevel: CapabilityLevel;
  activeLast30Days: boolean;
  lessonsCompleted: number;
  workflowsUsed: { id: string; title: string }[];
  estimatedHoursSavedMonthly: number;
  estimatedAnnualValueContributed: number;
};

/**
 * The real "Employee AI Profile": fluency (separate from adoption),
 * capability level, and this person's own contribution to organizational
 * value. Hours/value contributed is attributed per-employee by dividing an
 * adopted workflow's org-wide hoursSavedMonthly/capturedValue by how many
 * employees are actually active on it, then summing across every deployed
 * workflow this employee has personally used - real arithmetic on real
 * numbers, not a fabricated personal estimate.
 */
export async function getEmployeeAiProfile(organizationId: string, employeeId: string): Promise<EmployeeAiProfile> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [fluency, lessonsCompleted, recentUsageEvent, recentLesson, recentStep, usedWorkflowIds] = await Promise.all([
    getFluencyForEmployee(employeeId),
    prisma.lessonCompletion.count({ where: { employeeId } }),
    prisma.aIUsageEvent.findFirst({ where: { employeeId, createdAt: { gte: thirtyDaysAgo } }, select: { id: true } }),
    prisma.lessonCompletion.findFirst({ where: { employeeId, completedAt: { gte: thirtyDaysAgo } }, select: { id: true } }),
    prisma.workflowStepCompletion.findFirst({ where: { employeeId, completedAt: { gte: thirtyDaysAgo } }, select: { id: true } }),
    prisma.workflowStepCompletion.findMany({
      where: { employeeId },
      select: { workflowStep: { select: { workflowId: true } } },
    }),
  ]);

  const workflowIds = Array.from(new Set(usedWorkflowIds.map((s) => s.workflowStep.workflowId)));
  const workflows = workflowIds.length
    ? await prisma.workflow.findMany({ where: { id: { in: workflowIds } }, include: { steps: { select: { id: true } } } })
    : [];
  const statsByWorkflow = await getWorkflowDeploymentStatsForOrg(organizationId, workflows);

  let estimatedHoursSavedMonthly = 0;
  let estimatedAnnualValueContributed = 0;
  for (const w of workflows) {
    const stats = statsByWorkflow.get(w.id);
    if (!stats || stats.activeAdopters === 0) continue;
    estimatedHoursSavedMonthly += stats.hoursSavedMonthly / stats.activeAdopters;
    estimatedAnnualValueContributed += stats.capturedValue / stats.activeAdopters;
  }

  return {
    fluency,
    capabilityLevel: getCapabilityLevel({ fluencyScore: fluency?.overallScore ?? null, workflowsUsed: workflows.length }),
    activeLast30Days: Boolean(recentUsageEvent || recentLesson || recentStep),
    lessonsCompleted,
    workflowsUsed: workflows.map((w) => ({ id: w.id, title: w.title })),
    estimatedHoursSavedMonthly: Math.round(estimatedHoursSavedMonthly),
    estimatedAnnualValueContributed: Math.round(estimatedAnnualValueContributed),
  };
}

export type EmployeeMilestone = { id: string; title: string; achievedAt: Date | null; description: string };

/**
 * Discrete, honestly-dated achievements. Event-based milestones (first
 * lesson, first workflow, Nth workflow) are dated from the real record that
 * satisfied them. There is no "hours saved" milestone here on purpose: the
 * underlying number is a current monthly rate, not a cumulative lifetime
 * total, so a "50 hours saved" badge with a specific earned-date would be
 * fabricating precision the data doesn't support.
 */
export async function getEmployeeMilestones(employeeId: string): Promise<EmployeeMilestone[]> {
  const [firstLesson, stepCompletions] = await Promise.all([
    prisma.lessonCompletion.findFirst({ where: { employeeId }, orderBy: { completedAt: "asc" } }),
    prisma.workflowStepCompletion.findMany({
      where: { employeeId },
      orderBy: { completedAt: "asc" },
      select: { completedAt: true, workflowStep: { select: { workflowId: true } } },
    }),
  ]);

  const milestones: EmployeeMilestone[] = [
    {
      id: "first-lesson",
      title: "First AI training completed",
      achievedAt: firstLesson?.completedAt ?? null,
      description: "Completed your first Reldro lesson.",
    },
  ];

  const seenWorkflows = new Set<string>();
  let firstWorkflowAt: Date | null = null;
  let fifthWorkflowAt: Date | null = null;
  for (const s of stepCompletions) {
    seenWorkflows.add(s.workflowStep.workflowId);
    if (seenWorkflows.size === 1 && !firstWorkflowAt) firstWorkflowAt = s.completedAt;
    if (seenWorkflows.size === 5 && !fifthWorkflowAt) fifthWorkflowAt = s.completedAt;
  }

  milestones.push({
    id: "first-workflow",
    title: "First AI workflow used",
    achievedAt: firstWorkflowAt,
    description: "Completed a step in your first AI-enabled workflow.",
  });
  milestones.push({
    id: "five-workflows",
    title: "5 workflows used",
    achievedAt: fifthWorkflowAt,
    description: "Used AI across 5 different workflows.",
  });

  return milestones;
}
