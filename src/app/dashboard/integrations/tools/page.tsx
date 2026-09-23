import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getToolLibrary, getUnmanagedTools, ensureGlobalToolCatalog } from "@/lib/queries/tools";
import { TOOL_CATEGORY_LABEL, TOOL_STATUS_LABEL, TOOL_STATUS_TONE } from "@/lib/toolCatalog";
import { ToolStatusSelect } from "@/components/tools/ToolStatusSelect";
import { AddCustomToolForm } from "@/components/tools/AddCustomToolForm";

export default async function ToolLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;

  await ensureGlobalToolCatalog();
  const [tools, unmanaged] = await Promise.all([
    getToolLibrary(session.organizationId),
    getUnmanagedTools(session.organizationId),
  ]);

  const categories = Array.from(new Set(tools.map((t) => t.category)));
  const filtered = params.category ? tools.filter((t) => t.category === params.category) : tools;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/dashboard/integrations" className="text-xs font-medium text-ink-500 hover:text-ink-800">
          ← Integrations
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">Tool library</h1>
            <p className="mt-1 text-sm text-ink-500">
              What AI tools and platforms are approved, how employees are actually using them, and where usage has
              sprawled beyond review.
            </p>
          </div>
          <AddCustomToolForm />
        </div>
      </div>

      {unmanaged.length > 0 && (
        <Card className="border-olive-soft bg-olive-soft/40">
          <CardHeader
            title="Detected but not reviewed"
            subtitle={`${unmanaged.length} tool${unmanaged.length === 1 ? "" : "s"} showing up in real usage that aren't in your library yet`}
          />
          <CardBody className="flex flex-wrap gap-2">
            {unmanaged.map((t) => (
              <Badge key={t.name} tone="amber">
                {t.name} · {t.usage.distinctUsers} user{t.usage.distinctUsers === 1 ? "" : "s"}
              </Badge>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/integrations/tools" className={`rounded-full border px-3 py-1.5 text-xs font-medium ${!params.category ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}>
          All categories
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/dashboard/integrations/tools?category=${c}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${params.category === c ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600"}`}
          >
            {TOOL_CATEGORY_LABEL[c as keyof typeof TOOL_CATEGORY_LABEL]}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => (
          <Card key={tool.id} className="h-full">
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/dashboard/integrations/tools/${tool.id}`} className="text-sm font-semibold text-ink-900 hover:text-orchid-deep">
                    {tool.name}
                  </Link>
                  <p className="text-xs text-ink-500">{TOOL_CATEGORY_LABEL[tool.category as keyof typeof TOOL_CATEGORY_LABEL]}{tool.vendor ? ` · ${tool.vendor}` : ""}</p>
                </div>
                {tool.status ? (
                  <Badge tone={TOOL_STATUS_TONE[tool.status]}>{TOOL_STATUS_LABEL[tool.status]}</Badge>
                ) : (
                  <Badge tone="neutral">Not in library</Badge>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{tool.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                <span>{tool.usage.distinctUsers} user{tool.usage.distinctUsers === 1 ? "" : "s"} · {tool.usage.actionCount} actions</span>
                <ToolStatusSelect toolId={tool.id} currentStatus={tool.status} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
