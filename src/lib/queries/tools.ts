import "server-only";
import { prisma } from "@/lib/prisma";
import { GLOBAL_TOOL_CATALOG } from "@/lib/toolCatalog";
import type { ToolApprovalStatus } from "@prisma/client";

/** Idempotent - safe to call on every page load. Only inserts catalog tools that don't already exist by name. */
export async function ensureGlobalToolCatalog() {
  await prisma.tool.createMany({
    data: GLOBAL_TOOL_CATALOG.map((t) => ({
      name: t.name,
      category: t.category,
      vendor: t.vendor,
      description: t.description,
      capabilities: t.capabilities,
    })),
    skipDuplicates: true,
  });
}

export type ToolUsageStats = { distinctUsers: number; actionCount: number };

/** Real usage, matched by tool name against AIUsageEvent.tool (case-insensitive). */
async function getUsageStatsByToolName(organizationId: string, toolNames: string[]): Promise<Map<string, ToolUsageStats>> {
  const map = new Map<string, ToolUsageStats>();
  if (toolNames.length === 0) return map;

  const events = await prisma.aIUsageEvent.findMany({
    where: { organizationId, tool: { in: toolNames, mode: "insensitive" } },
    select: { tool: true, employeeId: true },
  });

  const byNameLower = new Map<string, { users: Set<string>; count: number }>();
  for (const e of events) {
    const key = e.tool.toLowerCase();
    const entry = byNameLower.get(key) ?? { users: new Set<string>(), count: 0 };
    if (e.employeeId) entry.users.add(e.employeeId);
    entry.count += 1;
    byNameLower.set(key, entry);
  }

  for (const name of toolNames) {
    const entry = byNameLower.get(name.toLowerCase());
    map.set(name, { distinctUsers: entry?.users.size ?? 0, actionCount: entry?.count ?? 0 });
  }
  return map;
}

export type ToolLibraryEntry = {
  id: string;
  name: string;
  category: string;
  vendor: string | null;
  description: string;
  capabilities: string[];
  isCustom: boolean;
  status: ToolApprovalStatus | null; // null = not yet added to this org's library
  usage: ToolUsageStats;
};

/** Every catalog + custom tool, with this org's approval status (if any) and real usage stats. */
export async function getToolLibrary(organizationId: string): Promise<ToolLibraryEntry[]> {
  await ensureGlobalToolCatalog();

  const [tools, orgTools] = await Promise.all([
    prisma.tool.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { name: "asc" },
    }),
    prisma.organizationTool.findMany({ where: { organizationId } }),
  ]);

  const statusByToolId = new Map(orgTools.map((ot) => [ot.toolId, ot.status]));
  const usageByName = await getUsageStatsByToolName(organizationId, tools.map((t) => t.name));

  return tools.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    vendor: t.vendor,
    description: t.description,
    capabilities: t.capabilities,
    isCustom: t.isCustom,
    status: statusByToolId.get(t.id) ?? null,
    usage: usageByName.get(t.name) ?? { distinctUsers: 0, actionCount: 0 },
  }));
}

export type UnmanagedTool = { name: string; usage: ToolUsageStats };

/**
 * "AI tool fragmentation": tool names that show up in real usage events but
 * aren't in this org's catalog at all (not even as UNDER_REVIEW) - the exact
 * gap that lets AI usage sprawl without anyone reviewing it.
 */
export async function getUnmanagedTools(organizationId: string): Promise<UnmanagedTool[]> {
  await ensureGlobalToolCatalog();
  const [distinctUsed, knownTools] = await Promise.all([
    prisma.aIUsageEvent.findMany({ where: { organizationId }, select: { tool: true }, distinct: ["tool"] }),
    prisma.tool.findMany({ where: { OR: [{ organizationId: null }, { organizationId }] }, select: { name: true } }),
  ]);
  const knownNamesLower = new Set(knownTools.map((t) => t.name.toLowerCase()));
  const unmanagedNames = distinctUsed.map((e) => e.tool).filter((name) => !knownNamesLower.has(name.toLowerCase()));

  const usageByName = await getUsageStatsByToolName(organizationId, unmanagedNames);
  return unmanagedNames.map((name) => ({ name, usage: usageByName.get(name) ?? { distinctUsers: 0, actionCount: 0 } }));
}

/** Matches free-text tool names (e.g. Workflow.toolsRequired) against real catalog/custom tools, for linking. */
export async function getMatchedTools(organizationId: string, toolNames: string[]): Promise<Map<string, string>> {
  if (toolNames.length === 0) return new Map();
  const tools = await prisma.tool.findMany({
    where: { name: { in: toolNames, mode: "insensitive" }, OR: [{ organizationId: null }, { organizationId }] },
    select: { id: true, name: true },
  });
  const byNameLower = new Map(tools.map((t) => [t.name.toLowerCase(), t.id]));
  const result = new Map<string, string>();
  for (const name of toolNames) {
    const id = byNameLower.get(name.toLowerCase());
    if (id) result.set(name, id);
  }
  return result;
}

export type WorkflowUsingTool = { id: string; title: string; department: string; organizationId: string | null };

/**
 * Reverse lookup for the tool detail page - "how does my team actually use
 * this tool?" Matches case-insensitively against Workflow.toolsRequired
 * since that's free text, not a real relation, and scoped to the global
 * catalog plus this org's own team-authored workflows.
 */
export async function getWorkflowsUsingTool(organizationId: string, toolName: string): Promise<WorkflowUsingTool[]> {
  const workflows = await prisma.workflow.findMany({
    where: { OR: [{ organizationId: null }, { organizationId }] },
    select: { id: true, title: true, department: true, organizationId: true, toolsRequired: true },
    orderBy: { title: "asc" },
  });
  const needle = toolName.toLowerCase();
  return workflows
    .filter((w) => w.toolsRequired.some((t) => t.toLowerCase() === needle))
    .map(({ id, title, department, organizationId: orgId }) => ({ id, title, department, organizationId: orgId }));
}

export async function getToolProfile(organizationId: string, toolId: string) {
  await ensureGlobalToolCatalog();
  const [tool, orgTool] = await Promise.all([
    prisma.tool.findUnique({ where: { id: toolId } }),
    prisma.organizationTool.findUnique({ where: { organizationId_toolId: { organizationId, toolId } } }),
  ]);
  if (!tool) return null;

  const usage = (await getUsageStatsByToolName(organizationId, [tool.name])).get(tool.name)!;
  const totalEmployees = await prisma.employee.count({ where: { organizationId } });

  return {
    tool,
    status: orgTool?.status ?? null,
    addedAt: orgTool?.addedAt ?? null,
    guidance: orgTool?.guidance ?? null,
    approvedUses: orgTool?.approvedUses ?? [],
    restrictedUses: orgTool?.restrictedUses ?? [],
    usage,
    adoptionPct: totalEmployees > 0 ? Math.round((usage.distinctUsers / totalEmployees) * 100) : 0,
  };
}
