import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getWorkflowDeploymentStatsForOrg } from "@/lib/queries/workflowDeployment";
import { WORKFLOW_STATUS_LABEL, WORKFLOW_STATUS_TONE } from "@/lib/workflowLifecycle";

const DIFFICULTY_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;

  const workflows = await prisma.workflow.findMany({
    where: { department: params.department || undefined },
    orderBy: { title: "asc" },
    include: { steps: { select: { id: true } } },
  });
  const statsByWorkflow = await getWorkflowDeploymentStatsForOrg(session.organizationId, workflows);

  const departments = Array.from(new Set(workflows.map((w) => w.department)));
  const byDepartment = new Map<string, typeof workflows>();
  for (const w of workflows) {
    byDepartment.set(w.department, [...(byDepartment.get(w.department) ?? []), w]);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Workflow library</h1>
        <p className="text-sm text-ink-500">AI-enabled versions of the processes your teams run every day.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/workflows" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.department ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
          All departments
        </Link>
        {departments.map((d) => (
          <Link
            key={d}
            href={`/dashboard/workflows?department=${encodeURIComponent(d)}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.department === d ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
          >
            {d}
          </Link>
        ))}
      </div>

      {[...byDepartment.entries()].map(([dept, items]) => (
        <div key={dept}>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{dept}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((w) => {
              const stats = statsByWorkflow.get(w.id)!;
              return (
                <Link key={w.id} href={`/dashboard/workflows/${w.id}`}>
                  <Card className="h-full transition-colors hover:border-brand-300">
                    <CardBody>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">{w.title}</p>
                        <Badge tone={WORKFLOW_STATUS_TONE[stats.status]}>{WORKFLOW_STATUS_LABEL[stats.status]}</Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{w.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge tone={DIFFICULTY_TONE[w.difficulty]}>{w.difficulty.toLowerCase()}</Badge>
                        <Badge>{w.timeSavedMinutes} min/day saved</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-ink-200 pt-3 text-xs">
                        <div>
                          <p className="text-ink-400">Owner</p>
                          <p className="font-medium text-ink-800">{stats.ownerName ?? "Unassigned"}</p>
                        </div>
                        <div>
                          <p className="text-ink-400">Adoption</p>
                          <p className="font-medium text-ink-800">{stats.adoptionPct}% ({stats.activeAdopters}/{stats.eligibleEmployees})</p>
                        </div>
                        {stats.estAnnualValue !== null && (
                          <>
                            <div>
                              <p className="text-ink-400">Estimated value</p>
                              <p className="font-medium text-ink-800">${Math.round(stats.estAnnualValue / 1000)}k/yr</p>
                            </div>
                            <div>
                              <p className="text-ink-400">Captured value</p>
                              <p className="font-medium text-ink-800">${Math.round(stats.capturedValue / 1000)}k/yr</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
