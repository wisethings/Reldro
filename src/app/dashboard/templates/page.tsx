import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PlusCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CopyPromptButton } from "@/components/workflows/CopyPromptButton";
import { StepMedia } from "@/components/workflows/StepMedia";
import { CreateTemplateForm } from "@/components/workflows/CreateTemplateForm";
import { DeleteTemplateButton } from "@/components/workflows/DeleteTemplateButton";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { ownDepartmentFilter } from "@/lib/departmentVisibility";
import { getMatchedTools } from "@/lib/queries/tools";
import { getCategoryIcon } from "@/lib/data/categoryIcon";

const SORT_OPTIONS = [
  { value: "relevant", label: "Most relevant" },
  { value: "uses", label: "Most used" },
  { value: "title", label: "A to Z" },
];

type TemplateRow =
  | { kind: "step"; id: string; title: string; prompt: string; department: string; imageUrl: string | null; videoUrl: string | null; workflowId: string; workflowTitle: string; tools: string[] }
  | { kind: "custom"; id: string; title: string; prompt: string; department: string; createdByName: string; imageUrl: string | null; videoUrl: string | null; tools: string[] };

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "relevant";

  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
    : null;
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";
  const canAuthorTemplates = isCompanyAdmin || Boolean(employee?.isDepartmentAdmin);
  const ownDepartment = ownDepartmentFilter(session, employee);

  const [departments, toolLibrary] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: session.organizationId }, orderBy: { name: "asc" } }),
    prisma.tool.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: session.organizationId }] },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);
  // Non-admins only ever see their own department's templates - see
  // ownDepartmentFilter's doc comment for why this isn't gated behind the
  // department-isolation toggle the way the Workflow library is.
  const departmentNames = ownDepartment ? [ownDepartment] : departments.map((d) => d.name);

  // Templates come from two sources: prompts attached to workflow steps
  // (both the seeded catalog and team-authored workflows), and standalone
  // Template rows an admin/lead writes directly without a whole workflow
  // behind them. Department names aren't globally unique, so without the
  // organizationId check here, a step from another org's team-authored
  // workflow in a same-named department would leak into this list.
  const [steps, customTemplates] = departmentNames.length
    ? await Promise.all([
        prisma.workflowStep.findMany({
          where: {
            aiPrompt: { not: null },
            workflow: {
              department: { in: departmentNames },
              OR: [{ organizationId: null }, { organizationId: session.organizationId }],
            },
          },
          include: { workflow: true },
          orderBy: [{ workflow: { department: "asc" } }, { workflow: { title: "asc" } }, { order: "asc" }],
        }),
        prisma.template.findMany({
          where: { organizationId: session.organizationId, department: { in: departmentNames } },
          orderBy: [{ department: "asc" }, { createdAt: "desc" }],
        }),
      ])
    : [[], []];

  const rows: TemplateRow[] = [
    // A step-derived template doesn't have its own tool tag - it inherits
    // the tools its parent workflow already declares as required, which is
    // real context (that's the tool the step's AI prompt is meant for)
    // rather than a guess.
    ...steps.map((step): TemplateRow => ({
      kind: "step",
      id: step.id,
      title: step.title,
      prompt: step.aiPrompt!,
      department: step.workflow.department,
      imageUrl: step.imageUrl,
      videoUrl: step.videoUrl,
      workflowId: step.workflow.id,
      workflowTitle: step.workflow.title,
      tools: step.workflow.toolsRequired,
    })),
    ...customTemplates.map((t): TemplateRow => ({
      kind: "custom",
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      department: t.department,
      createdByName: t.createdByName,
      imageUrl: t.imageUrl,
      videoUrl: t.videoUrl,
      tools: t.tools,
    })),
  ];

  const allToolNames = Array.from(new Set(rows.flatMap((r) => r.tools)));
  const [matchedTools, usageCounts] = await Promise.all([
    getMatchedTools(session.organizationId, allToolNames),
    rows.length
      ? prisma.aIUsageEvent.groupBy({
          by: ["sourceId"],
          where: { organizationId: session.organizationId, eventType: "template_copied", sourceId: { in: rows.map((r) => r.id) } },
          _count: { sourceId: true },
        })
      : Promise.resolve([]),
  ]);
  // The only real signal we have for "how much is this template actually
  // used" - a count of real copy events, tied to this exact template via
  // AIUsageEvent.sourceId. No fabricated "avg time saved" or "rating" here:
  // there's no schema-backed data source for either.
  const usesById = new Map(usageCounts.map((u) => [u.sourceId!, u._count.sourceId]));

  const lowerQ = q;
  const searched = lowerQ
    ? rows.filter((r) => r.title.toLowerCase().includes(lowerQ) || r.prompt.toLowerCase().includes(lowerQ))
    : rows;
  const sorted = [...searched].sort((a, b) => {
    if (sort === "uses") return (usesById.get(b.id) ?? 0) - (usesById.get(a.id) ?? 0);
    if (sort === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  const byDepartment = new Map<string, TemplateRow[]>();
  for (const row of sorted) {
    byDepartment.set(row.department, [...(byDepartment.get(row.department) ?? []), row]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Templates</h1>
        <p className="text-sm text-ink-500">
          {ownDepartment
            ? `Ready-to-use AI prompts for ${employee?.department?.name ?? "your team"}. Copy one straight into whatever tool you're using.`
            : "Ready-to-use AI prompts, pulled from the workflows relevant to your departments. Copy one straight into whatever tool you're using."}
        </p>
      </div>

      {canAuthorTemplates && (
        <Card>
          <CardHeader icon={<IconBadge icon={<PlusCircle size={18} />} tone="orchid" />} title="New template" subtitle="A standalone prompt worth sharing, without needing a whole workflow behind it." />
          <CardBody>
            <CreateTemplateForm
              lockDepartment={isCompanyAdmin ? null : employee?.department?.name ?? null}
              departmentOptions={departments.map((d) => d.name)}
              toolOptions={toolLibrary.map((t) => t.name)}
            />
          </CardBody>
        </Card>
      )}

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search templates..." />

      {[...byDepartment.entries()].map(([department, deptRows]) => (
        <div key={department}>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{department}</h2>
          <div className="space-y-3">
            {deptRows.map((row) => {
              const Icon = getCategoryIcon(`${row.title} ${row.prompt}`);
              const uses = usesById.get(row.id) ?? 0;
              return (
                <Card key={`${row.kind}-${row.id}`}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <IconBadge icon={<Icon size={18} />} tone="coral" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900">{row.title}</p>
                          {row.kind === "step" ? (
                            <Link href={`/dashboard/workflows/${row.workflowId}`} className="text-xs text-orchid-deep hover:text-oxblood">
                              {row.workflowTitle}
                            </Link>
                          ) : (
                            <p className="text-xs text-ink-500">{row.createdByName ? `Added by ${row.createdByName}` : "Team template"}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge tone="neutral">{uses} use{uses === 1 ? "" : "s"}</Badge>
                            {row.tools.map((toolName) =>
                              matchedTools.has(toolName) ? (
                                <Link key={toolName} href={`/dashboard/integrations/tools/${matchedTools.get(toolName)}`}>
                                  <Badge tone="brand">{toolName}</Badge>
                                </Link>
                              ) : (
                                <Badge key={toolName}>{toolName}</Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <CopyPromptButton prompt={row.prompt} workflowStepId={row.id} />
                        {row.kind === "custom" && canAuthorTemplates && (isCompanyAdmin || row.department === employee?.department?.name) && (
                          <DeleteTemplateButton templateId={row.id} />
                        )}
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-ink-50 p-3">
                      <p className="font-mono text-xs text-ink-700">{row.prompt}</p>
                    </div>
                    <StepMedia imageUrl={row.imageUrl} videoUrl={row.videoUrl} title={row.title} />
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">
              No templates yet for your department{ownDepartment ? "" : "s"}. Check back once your organization's workflows have
              prompts attached, or{" "}
              <Link href="/dashboard/workflows" className="text-orchid-deep hover:text-oxblood">
                browse the workflow library
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      )}
      {rows.length > 0 && sorted.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">No templates match &quot;{q}&quot;.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
