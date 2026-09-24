import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";

const STATUS_TONE = { PLANNED: "neutral", IN_PROGRESS: "blue", COMPLETED: "green", ON_HOLD: "amber" } as const;

export default async function InitiativesPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  const initiatives = await prisma.initiative.findMany({
    where: { organizationId: session.organizationId },
    include: { members: true, workflows: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Initiatives</h1>
          <p className="text-sm text-ink-500">Cross-functional AI adoption programs with owners, timelines, and KPIs.</p>
        </div>
        {session.role === "COMPANY_ADMIN" && (
          <Link
            href="/dashboard/initiatives/new"
            className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            New initiative
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {initiatives.map((init) => {
          const now = Date.now();
          const total = init.endDate.getTime() - init.startDate.getTime();
          const elapsed = Math.min(total, Math.max(0, now - init.startDate.getTime()));
          const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
          return (
            <Link key={init.id} href={`/dashboard/initiatives/${init.id}`}>
              <Card className="h-full hover:border-brand-300">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">{init.name}</p>
                    <Badge tone={STATUS_TONE[init.status]}>{init.status.replace("_", " ").toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{init.goalDescription}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {init.departments.map((d) => (
                      <Badge key={d}>{d}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-ink-500">
                    <span>{init.members.length} employees · {init.workflows.length} workflows</span>
                    <span>{pct}% through timeline</span>
                  </div>
                  <ProgressBar value={pct} className="mt-1.5" />
                </CardBody>
              </Card>
            </Link>
          );
        })}
        {initiatives.length === 0 && <p className="text-sm text-ink-500">No initiatives yet.</p>}
      </div>
    </div>
  );
}
