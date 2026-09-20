import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function PlatformWorkflowsPage() {
  const workflows = await prisma.workflow.findMany({
    include: { _count: { select: { organizationWorkflows: true, opportunities: true } } },
    orderBy: { department: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Workflow templates</h1>
        <p className="text-sm text-ink-500">The global workflow library available to every organization.</p>
      </div>
      <Card>
        <CardBody className="divide-y divide-ink-100 p-0">
          {workflows.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{w.title}</p>
                <p className="text-xs text-ink-500">{w.department}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <Badge>{w._count.organizationWorkflows} orgs adopted</Badge>
                <Badge>{w._count.opportunities} linked opportunities</Badge>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
