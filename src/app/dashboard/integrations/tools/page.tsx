import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { Bot, Users, Building2, Layers, Palette, Code2, MessageCircle, BarChart3, Headset, DollarSign, UserCog, Server, Wrench } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconBadge } from "@/components/ui/IconBadge";
import { CardArrow } from "@/components/ui/CardArrow";
import { SearchSortBar } from "@/components/ui/SearchSortBar";
import { getToolLibrary, getUnmanagedTools, ensureGlobalToolCatalog } from "@/lib/queries/tools";
import { TOOL_CATEGORY_LABEL, TOOL_STATUS_LABEL, TOOL_STATUS_TONE } from "@/lib/toolCatalog";
import { ToolStatusSelect } from "@/components/tools/ToolStatusSelect";
import { AddCustomToolForm } from "@/components/tools/AddCustomToolForm";
import type { ToolCategory } from "@prisma/client";

const SORT_OPTIONS = [
  { value: "name", label: "A to Z" },
  { value: "usage", label: "Most used" },
];

const TOOL_CATEGORY_ICON: Record<ToolCategory, ComponentType<{ size?: number }>> = {
  AI_ASSISTANT: Bot,
  CRM: Users,
  ERP: Building2,
  PRODUCTIVITY: Layers,
  DESIGN: Palette,
  DEVELOPMENT: Code2,
  COMMUNICATION: MessageCircle,
  ANALYTICS: BarChart3,
  CUSTOMER_SERVICE: Headset,
  FINANCE: DollarSign,
  HR: UserCog,
  INTERNAL_PLATFORM: Server,
  OTHER: Wrench,
};

export default async function ToolLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const isAdmin = session.role === "COMPANY_ADMIN";
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const sort = params.sort ?? "name";

  await ensureGlobalToolCatalog();
  const [tools, unmanaged] = await Promise.all([
    getToolLibrary(session.organizationId),
    getUnmanagedTools(session.organizationId),
  ]);

  const categories = Array.from(new Set(tools.map((t) => t.category)));
  const byCategory = params.category ? tools.filter((t) => t.category === params.category) : tools;
  const searched = q
    ? byCategory.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    : byCategory;
  const filtered = [...searched].sort((a, b) =>
    sort === "usage" ? b.usage.actionCount - a.usage.actionCount : a.name.localeCompare(b.name)
  );

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
              What AI tools and platforms are approved, how employees are actually using them, and which workflows use
              each one.
            </p>
          </div>
          {isAdmin && <AddCustomToolForm />}
        </div>
      </div>

      {unmanaged.length > 0 && (
        <Card className="border-olive-soft bg-olive-soft/40">
          <CardHeader
            icon={<IconBadge icon={<Wrench size={18} />} tone="olive" />}
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

      <SearchSortBar sortOptions={SORT_OPTIONS} placeholder="Search tools..." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => {
          const category = tool.category as ToolCategory;
          const Icon = TOOL_CATEGORY_ICON[category];
          return (
            <Card key={tool.id} className="h-full">
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <IconBadge icon={<Icon size={18} />} tone="sage" />
                  {tool.status ? (
                    <Badge tone={TOOL_STATUS_TONE[tool.status]}>{TOOL_STATUS_LABEL[tool.status]}</Badge>
                  ) : (
                    <Badge tone="neutral">Not in library</Badge>
                  )}
                </div>
                <Link href={`/dashboard/integrations/tools/${tool.id}`} className="mt-2 block text-sm font-semibold text-ink-900 hover:text-orchid-deep">
                  {tool.name}
                </Link>
                <p className="text-xs text-ink-500">{TOOL_CATEGORY_LABEL[category]}{tool.vendor ? ` · ${tool.vendor}` : ""}</p>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{tool.description}</p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-200 pt-3 text-xs text-ink-500">
                  <span>{tool.usage.distinctUsers} user{tool.usage.distinctUsers === 1 ? "" : "s"} · {tool.usage.actionCount} actions</span>
                  <div className="flex items-center gap-2">
                    {isAdmin && <ToolStatusSelect toolId={tool.id} currentStatus={tool.status} />}
                    <Link href={`/dashboard/integrations/tools/${tool.id}`}>
                      <CardArrow />
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardBody>
              <p className="text-sm text-ink-500">No tools match {q ? `"${q}"` : "this filter"}.</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
