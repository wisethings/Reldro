import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { connectIntegration, disconnectIntegration } from "@/lib/actions/integrations";

export default async function IntegrationsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const [integrations, connections] = await Promise.all([
    prisma.integration.findMany({ orderBy: { name: "asc" } }),
    prisma.integrationConnection.findMany({ where: { organizationId: session.organizationId } }),
  ]);
  const connectionByIntegration = new Map(connections.map((c) => [c.integrationId, c]));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Integrations</h1>
        <p className="text-sm text-ink-500">
          Demo connections for the MVP — no live data is pulled yet. Each integration is clearly marked as a mock
          connection until real sync is enabled.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const conn = connectionByIntegration.get(integration.id);
          const connected = conn?.status === "CONNECTED";
          return (
            <Card key={integration.id}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{integration.name}</p>
                    <p className="text-xs text-ink-500">{integration.category}</p>
                  </div>
                  <Badge tone={connected ? "green" : "neutral"}>{connected ? "Connected (demo)" : "Not connected"}</Badge>
                </div>
                <p className="mt-2 text-xs text-ink-500">{integration.description}</p>
                {connected && conn?.lastSyncAt && (
                  <p className="mt-2 text-[11px] text-ink-400">Last synced {conn.lastSyncAt.toLocaleString()}</p>
                )}
                <form action={(connected ? disconnectIntegration : connectIntegration).bind(null, integration.id)} className="mt-3">
                  <button
                    className={`w-full rounded-full px-3 py-2 text-xs font-medium ${
                      connected ? "border border-ink-300 text-ink-700 hover:bg-ink-50" : "bg-brand-700 text-white hover:bg-brand-800"
                    }`}
                  >
                    {connected ? "Disconnect" : "Connect"}
                  </button>
                </form>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
