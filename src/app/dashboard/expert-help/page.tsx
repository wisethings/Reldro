import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STATUS_TONE = { OPEN: "amber", PROPOSED: "blue", ACTIVE: "green", COMPLETED: "neutral", CANCELLED: "neutral" } as const;
const STATUS_LABEL = {
  OPEN: "Awaiting match",
  PROPOSED: "Specialist assigned",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export default async function ExpertHelpPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const requests = await prisma.project.findMany({
    where: { organizationId: session.organizationId },
    include: { specialist: { include: { user: true } }, opportunity: true, workflow: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Expert Help</h1>
        <p className="text-sm text-ink-500">
          When a workflow or opportunity is too complex to implement alone, request help and our team will match you
          with a vetted AI specialist.
        </p>
      </div>

      <Card>
        <CardHeader title="Your requests" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {requests.length === 0 && (
            <div className="p-6 text-sm text-ink-500">
              No requests yet. Open an opportunity or a high-complexity workflow and use "Request expert help" to get
              started.
            </div>
          )}
          {requests.map((r) => (
            <Link key={r.id} href={`/dashboard/projects/${r.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{r.title}</p>
                <p className="text-xs text-ink-500">
                  {r.specialist ? `Matched with ${r.specialist.user.name}` : "Not yet matched"}
                  {" · "}
                  {r.createdAt.toLocaleDateString()}
                </p>
              </div>
              <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
