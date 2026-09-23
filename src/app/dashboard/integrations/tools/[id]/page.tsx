import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { getToolProfile } from "@/lib/queries/tools";
import { TOOL_CATEGORY_LABEL, TOOL_STATUS_LABEL, TOOL_STATUS_TONE } from "@/lib/toolCatalog";
import { ToolStatusSelect } from "@/components/tools/ToolStatusSelect";
import { ToolPlaybookEditor } from "@/components/tools/ToolPlaybookEditor";

export default async function ToolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const profile = await getToolProfile(session.organizationId, id);
  if (!profile) notFound();
  const { tool, status, usage, adoptionPct, addedAt, guidance, approvedUses, restrictedUses } = profile;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/integrations/tools" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Tool library
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{tool.name}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {TOOL_CATEGORY_LABEL[tool.category]}{tool.vendor ? ` · ${tool.vendor}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status && <Badge tone={TOOL_STATUS_TONE[status]}>{TOOL_STATUS_LABEL[status]}</Badge>}
            <ToolStatusSelect toolId={tool.id} currentStatus={status} />
          </div>
        </div>
        {addedAt && <p className="mt-1 text-xs text-ink-400">Added to your library {addedAt.toLocaleDateString()}</p>}
      </div>

      <Card>
        <CardHeader title="Overview" />
        <CardBody>
          <p className="text-sm text-ink-700">{tool.description}</p>
          {tool.capabilities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tool.capabilities.map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Users" value={usage.distinctUsers} helpText={`${adoptionPct}% of the organization`} />
        <StatTile label="AI actions logged" value={usage.actionCount} />
        <StatTile label="Status" value={status ? TOOL_STATUS_LABEL[status] : "Not reviewed"} />
      </div>

      {usage.distinctUsers === 0 && (
        <p className="text-sm text-ink-500">No usage detected for this tool yet at your organization.</p>
      )}

      {status && (
        <Card>
          <CardHeader title="Playbook" subtitle={`When you use ${tool.name} here, this is how you're expected to use AI`} />
          <CardBody>
            <ToolPlaybookEditor
              toolId={tool.id}
              toolName={tool.name}
              guidance={guidance}
              approvedUses={approvedUses}
              restrictedUses={restrictedUses}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
