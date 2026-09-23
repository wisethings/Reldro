import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DemoRequestRow } from "@/components/platform-admin/DemoRequestRow";

export default async function PlatformDemoRequestsPage() {
  const requests = await prisma.demoRequest.findMany({ orderBy: { createdAt: "desc" } });
  const newCount = requests.filter((r) => r.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Demo requests</h1>
        <p className="text-sm text-ink-500">
          {requests.length} total · {newCount} awaiting first contact
        </p>
      </div>
      <Card>
        <CardHeader title="Inbound requests" subtitle="Provision a workspace once you've connected with the prospect" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {requests.map((r) => (
            <DemoRequestRow
              key={r.id}
              id={r.id}
              name={r.name}
              email={r.email}
              companyName={r.companyName}
              companySize={r.companySize}
              message={r.message}
              status={r.status}
              createdAt={r.createdAt.toLocaleString()}
            />
          ))}
          {requests.length === 0 && <p className="p-5 text-sm text-ink-500">No demo requests yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
