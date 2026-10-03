import Link from "next/link";
import { AdaptiveSelect } from "@/components/ui/PersonSelect";
import { QueryLink } from "@/components/ui/QueryLink";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { describeAuditAction } from "@/lib/audit";
import { PageHeader } from "@/components/safety/ui";
import { LocalTime } from "@/components/safety/LocalTime";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { LIST_PAGE } from "@/components/ui/layout";

const AREAS: Record<string, { label: string; prefixes: string[] }> = {
  safety: { label: "Reports and safety work", prefixes: ["safety."] },
  people: { label: "People and access", prefixes: ["employee.", "admin.", "invite.", "account."] },
  settings: { label: "Settings and setup", prefixes: ["settings.", "content.", "integration.", "subscription.", "setup_support."] },
};
const RANGES: Record<string, { label: string; days: number | null }> = { "7": { label: "7 days", days: 7 }, "30": { label: "30 days", days: 30 }, "90": { label: "90 days", days: 90 }, all: { label: "All time", days: null } };

export default async function ActivityLogPage({ searchParams }: { searchParams: Promise<{ area?: string; range?: string; who?: string; page?: string }> }) {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");
  const orgId = session.organizationId;
  const p = await searchParams;
  const area = p.area && AREAS[p.area] ? p.area : "";
  const range = p.range && RANGES[p.range] ? p.range : "30";
  const who = p.who ?? "";
  const since = RANGES[range].days ? new Date(Date.now() - RANGES[range].days! * 86_400_000) : null;

  const where = {
    organizationId: orgId,
    // What Reldro staff do inside a workspace is recorded for Reldro, in the platform console, not shown here.
    NOT: { action: { startsWith: "platform." } },
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(who === "system" ? { userId: null } : who ? { userId: who } : {}),
    ...(area ? { OR: AREAS[area].prefixes.map((prefix) => ({ action: { startsWith: prefix } })) } : {}),
  };
  const total = await prisma.auditLog.count({ where });
  const page = Math.min(readPage(p.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const [rows, people] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.user.findMany({ where: { organizationId: orgId, auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const href = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { area, range, who, page: undefined as string | undefined, ...over };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "range" && v === "30") && !(k === "page" && v === "1")) q.set(k, v);
    const s = q.toString();
    return `/dashboard/settings/activity${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `pill ${on ? "pill-on" : "pill-off"}`;

  return (
    <div className={LIST_PAGE}>
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-xs font-medium text-orchid-deep hover:text-oxblood"><ChevronLeft size={14} aria-hidden /> Settings</Link>
      <PageHeader title="Activity log" subtitle="Who changed what across your workspace, most recent first." />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Area">
          <QueryLink href={href({ area: undefined })} className={chip(!area)}>All areas</QueryLink>
          {Object.entries(AREAS).map(([k, a]) => <QueryLink key={k} href={href({ area: k })} className={chip(area === k)}>{a.label}</QueryLink>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time range">
          {Object.entries(RANGES).map(([k, r]) => <QueryLink key={k} href={href({ range: k })} className={chip(range === k)}>{r.label}</QueryLink>)}
          <form action="/dashboard/settings/activity" className="ml-auto flex items-center gap-2">
            {area && <input type="hidden" name="area" value={area} />}
            {range !== "30" && <input type="hidden" name="range" value={range} />}
            <AdaptiveSelect variant="toolbar" name="who" id="who" aria-label="Person" noun="person" alwaysSearch defaultValue={who} pinned={[{ value: "", label: "Everyone" }, { value: "system", label: "System" }]} options={people.map((u) => ({ value: u.id, label: u.name }))} className="w-44" />
            <button type="submit" className="h-10 rounded-full border border-ink-300 px-3 text-xs md:h-8 font-medium text-ink-700 hover:bg-surface-hover">Apply</button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden surface">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">Nothing matches these filters.</p>
        ) : (
          <ol className="divide-y divide-ink-100">
            {rows.map((log) => (
              <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-ink-900">{describeAuditAction(log.action)}</p>
                  <p className="text-xs text-ink-500">{log.user?.name ?? "System"}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-500"><LocalTime value={log.createdAt} /></span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Pagination page={page} total={total} noun="entries" hrefFor={(n) => href({ page: n > 1 ? String(n) : undefined })} />
    </div>
  );
}
