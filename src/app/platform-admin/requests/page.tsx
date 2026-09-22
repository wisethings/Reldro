import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { matchSpecialists } from "@/lib/matching";
import { assignSpecialistToProject } from "@/lib/actions/marketplace";

export default async function PlatformRequestsPage() {
  const openRequests = await prisma.project.findMany({
    where: { status: "OPEN", specialistId: null },
    include: { organization: true, opportunity: { include: { department: true } }, workflow: true },
    orderBy: { createdAt: "desc" },
  });

  const assignedRequests = await prisma.project.findMany({
    where: { status: { not: "OPEN" } },
    include: { organization: true, specialist: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Expert help requests</h1>
        <p className="text-sm text-ink-500">Match open requests with a specialist to turn them into active engagements.</p>
      </div>

      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <p className="text-sm font-semibold text-ink-900">Awaiting match ({openRequests.length})</p>
        </div>
        <CardBody className="divide-y divide-ink-100 p-0">
          {openRequests.length === 0 && <p className="p-6 text-sm text-ink-500">No open requests right now.</p>}
          {await Promise.all(
            openRequests.map(async (request) => {
              const suggestions = await matchSpecialists({
                industry: request.organization.industry,
                department: request.opportunity?.department?.name ?? request.workflow?.department,
                tools: request.opportunity?.toolsRequired ?? request.workflow?.toolsRequired,
                complexity: request.opportunity?.complexity ?? request.workflow?.difficulty,
              });

              return (
                <div key={request.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{request.title}</p>
                      <p className="text-xs text-ink-500">{request.organization.name}</p>
                      {request.description && <p className="mt-1 whitespace-pre-line text-xs text-ink-600">{request.description}</p>}
                      {request.budget && <p className="mt-1 text-xs text-ink-500">Budget: ${request.budget.toLocaleString()}</p>}
                    </div>
                    <Badge tone="amber">Awaiting match</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {suggestions.length === 0 && (
                      <p className="text-xs text-ink-400 sm:col-span-3">No auto-matched suggestions — assign manually in the Specialists tab.</p>
                    )}
                    {suggestions.map(({ specialist, reasons }) => (
                      <div key={specialist.id} className="rounded-lg border border-ink-200 p-3">
                        <p className="text-xs font-medium text-ink-900">{specialist.user.name}</p>
                        <p className="text-[11px] text-ink-500">{specialist.headline}</p>
                        <ul className="mt-1 space-y-0.5 text-[11px] text-ink-500">
                          {reasons.slice(0, 2).map((r) => (
                            <li key={r}>· {r}</li>
                          ))}
                        </ul>
                        <form action={assignSpecialistToProject.bind(null, request.id, specialist.id)} className="mt-2">
                          <button className="w-full rounded-md bg-brand-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-800">
                            Assign
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <p className="text-sm font-semibold text-ink-900">Recently matched</p>
        </div>
        <CardBody className="divide-y divide-ink-100 p-0">
          {assignedRequests.length === 0 && <p className="p-6 text-sm text-ink-500">No matched engagements yet.</p>}
          {assignedRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-ink-900">{r.title}</p>
                <p className="text-xs text-ink-500">
                  {r.organization.name} {r.specialist && `· ${r.specialist.user.name}`}
                </p>
              </div>
              <Badge tone={r.status === "ACTIVE" ? "green" : "blue"}>{r.status.toLowerCase()}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
