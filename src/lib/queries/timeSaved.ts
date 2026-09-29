import "server-only";
import { prisma } from "@/lib/prisma";

export type WorkflowTimeSavedStats = {
  /** Average of every employee-reported minutes-saved figure for this workflow at this org, or null if nobody has reported one yet. */
  avgMinutesSaved: number | null;
  reportCount: number;
  /** The current employee's own logged figure, if they've reported one - used to decide whether to show the log-it prompt. */
  myMinutesSaved: number | null;
};

/** Real, employee-reported time-saved data for a workflow - see WorkflowTimeSavedLog for why this exists alongside the catalog's own static timeSavedMinutes guess. */
export async function getWorkflowTimeSavedStats(
  organizationId: string,
  workflowId: string,
  employeeId: string | null
): Promise<WorkflowTimeSavedStats> {
  const [agg, mine] = await Promise.all([
    prisma.workflowTimeSavedLog.aggregate({
      where: { organizationId, workflowId },
      _avg: { minutesSaved: true },
      _count: { _all: true },
    }),
    employeeId
      ? prisma.workflowTimeSavedLog.findUnique({
          where: { employeeId_workflowId: { employeeId, workflowId } },
          select: { minutesSaved: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    avgMinutesSaved: agg._count._all > 0 ? Math.round(agg._avg.minutesSaved ?? 0) : null,
    reportCount: agg._count._all,
    myMinutesSaved: mine?.minutesSaved ?? null,
  };
}
