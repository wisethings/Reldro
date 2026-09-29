import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { Layers, MessageCircle, Users, BookOpen, Code2, Headset, ShoppingCart, ClipboardList, DollarSign, Puzzle, Wrench } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { connectIntegration, disconnectIntegration } from "@/lib/actions/integrations";

const CATEGORY_ICON: Record<string, ComponentType<{ size?: number }>> = {
  Productivity: Layers,
  Communication: MessageCircle,
  CRM: Users,
  Knowledge: BookOpen,
  Engineering: Code2,
  Support: Headset,
  Commerce: ShoppingCart,
  "Project management": ClipboardList,
  Finance: DollarSign,
};
const SORT_OPTIONS = [
  { value: "name", label: "A to Z" },
  { value: "category", label: "By category" },
];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack_connected?: string; slack_error?: string; status?: string; q?: string; sort?: string }>;
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "name";

  const [integrations, connections] = await Promise.all([
    prisma.integration.findMany({ orderBy: { name: "asc" } }),
    prisma.integrationConnection.findMany({ where: { organizationId: session.organizationId } }),
  ]);
  const connectionByIntegration = new Map(connections.map((c) => [c.integrationId, c]));

  const enriched = integrations.map((integration) => {
    const conn = connectionByIntegration.get(integration.id);
    const connected = conn?.status === "CONNECTED";
    const isReal = connected && Boolean(conn?.accessToken);
    return { integration, conn, connected, isReal };
  });

  const connectedCount = enriched.filter((e) => e.connected).length;
  const demoCount = enriched.filter((e) => e.connected && !e.isReal).length;
  const notConnectedCount = enriched.length - connectedCount;

  const filtered = enriched
    .filter((e) => {
      if (params.status === "connected") return e.connected;
      if (params.status === "not_connected") return !e.connected;
      if (params.status === "demo") return e.connected && !e.isReal;
      return true;
    })
    .filter((e) => !q || e.integration.name.toLowerCase().includes(q) || e.integration.description.toLowerCase().includes(q));
  const sorted = [...filtered].sort((a, b) =>
    sort === "category" ? a.integration.category.localeCompare(b.integration.category) : a.integration.name.localeCompare(b.integration.name)
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Integrations</h1>
        <p className="text-sm text-ink-500">
          Slack connects live when configured. Every other integration here is a demo connection for now, and no
          live data is pulled yet. Each is clearly marked as live or demo.
        </p>
      </div>

      {params.slack_connected && (
        <p className="rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep">Slack connected.</p>
      )}
      {params.slack_error && (
        <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-danger">Slack connection failed: {params.slack_error}</p>
      )}

      <Card>
        <CardHeader
          icon={<IconBadge icon={<Wrench size={18} />} tone="orchid" />}
          title="Tool library"
          subtitle="Govern which AI tools and platforms are approved, and see how they're actually being used"
        />
        <CardBody>
          <Link
            href="/dashboard/integrations/tools"
            className="inline-block rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Browse tool library →
          </Link>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/integrations" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.status ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
            All integrations ({enriched.length})
          </Link>
          <Link href="/dashboard/integrations?status=connected" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.status === "connected" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
            Connected ({connectedCount})
          </Link>
          <Link href="/dashboard/integrations?status=not_connected" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.status === "not_connected" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
            Not connected ({notConnectedCount})
          </Link>
          {demoCount > 0 && (
            <Link href="/dashboard/integrations?status=demo" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.status === "demo" ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
              Demo connections ({demoCount})
            </Link>
          )}
        </div>
      </div>

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search integrations..." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(({ integration, conn, connected, isReal }) => {
          const Icon = CATEGORY_ICON[integration.category] ?? Puzzle;
          return (
            <Card key={integration.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <IconBadge icon={<Icon size={18} />} tone="sage" />
                  <Badge tone={connected ? "green" : "neutral"}>
                    {connected ? (isReal ? "Connected" : "Connected (demo)") : "Not connected"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900">{integration.name}</p>
                <p className="text-xs text-ink-500">{integration.category}</p>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{integration.description}</p>
                {isReal && conn?.externalAccountName && (
                  <p className="mt-2 text-[11px] text-ink-400">Workspace: {conn.externalAccountName}</p>
                )}
                {connected && !isReal && conn?.lastSyncAt && (
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
        {sorted.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardBody>
              <p className="text-sm text-ink-500">No integrations match {q ? `"${q}"` : "this filter"}.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
