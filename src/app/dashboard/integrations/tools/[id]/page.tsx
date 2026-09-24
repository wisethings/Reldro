import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";
import { getToolProfile, getWorkflowsUsingTool } from "@/lib/queries/tools";
import { TOOL_CATEGORY_LABEL, TOOL_STATUS_LABEL, TOOL_STATUS_TONE } from "@/lib/toolCatalog";
import { ToolStatusSelect } from "@/components/tools/ToolStatusSelect";
import { ToolPlaybookEditor } from "@/components/tools/ToolPlaybookEditor";

export default async function ToolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const isAdmin = session.role === "COMPANY_ADMIN";
  const { id } = await params;

  const profile = await getToolProfile(session.organizationId, id);
  if (!profile) notFound();
  const { tool, status, usage, adoptionPct, addedAt, guidance, approvedUses, restrictedUses } = profile;
  const workflowsUsingTool = await getWorkflowsUsingTool(session.organizationId, tool.name);

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
            {isAdmin && <ToolStatusSelect toolId={tool.id} currentStatus={status} />}
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
              readOnly={!isAdmin}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Workflows using this tool"
          subtitle={`How your team actually puts ${tool.name} to work, step by step`}
        />
        <CardBody className="divide-y divide-ink-200 p-0">
          {workflowsUsingTool.map((w) => (
            <Link
              key={w.id}
              href={`/dashboard/workflows/${w.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-ink-50"
            >
              <span className="text-sm font-medium text-ink-900">{w.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <Badge>{w.department}</Badge>
                {w.organizationId && <Badge tone="brand">Team-authored</Badge>}
              </div>
            </Link>
          ))}
          {workflowsUsingTool.length === 0 && (
            <p className="p-5 text-sm text-ink-500">No workflows reference {tool.name} yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
