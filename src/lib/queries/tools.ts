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
    usage,
    adoptionPct: totalEmployees > 0 ? Math.round((usage.distinctUsers / totalEmployees) * 100) : 0,
  };
}
