import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { describeAuditAction } from "@/lib/audit";
import { PageHeader } from "@/components/safety/ui";
import { LocalTime } from "@/components/safety/LocalTime";

const PAGE_SIZE = 30;
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
  const page = Math.max(1, Number.parseInt(p.page ?? "1", 10) || 1);
  const since = RANGES[range].days ? new Date(Date.now() - RANGES[range].days! * 86_400_000) : null;

  const where = {
    organizationId: orgId,
    ...(since ? { createdAt: { gte: since } } : {}),
    ...(who === "system" ? { userId: null } : who ? { userId: who } : {}),
    ...(area ? { OR: AREAS[area].prefixes.map((prefix) => ({ action: { startsWith: prefix } })) } : {}),
  };
  const [rows, total, people] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ where: { organizationId: orgId, auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { area, range, who, page: undefined as string | undefined, ...over };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "range" && v === "30") && !(k === "page" && v === "1")) q.set(k, v);
    const s = q.toString();
    return `/dashboard/settings/activity${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"}`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
      <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-xs font-medium text-orchid-deep hover:text-oxblood"><ChevronLeft size={14} aria-hidden /> Settings</Link>
      <PageHeader title="Activity log" subtitle="Who changed what across your workspace, most recent first." />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Area">
          <Link href={href({ area: undefined })} className={chip(!area)}>All areas</Link>
          {Object.entries(AREAS).map(([k, a]) => <Link key={k} href={href({ area: k })} className={chip(area === k)}>{a.label}</Link>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time range">
          {Object.entries(RANGES).map(([k, r]) => <Link key={k} href={href({ range: k })} className={chip(range === k)}>{r.label}</Link>)}
          <form action="/dashboard/settings/activity" className="ml-auto flex items-center gap-2">
            {area && <input type="hidden" name="area" value={area} />}
            {range !== "30" && <input type="hidden" name="range" value={range} />}
            <label className="sr-only" htmlFor="who">Person</label>
            <select id="who" name="who" defaultValue={who} className="h-8 max-w-[11rem] rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-800">
              <option value="">Everyone</option>
              <option value="system">System</option>
              {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button type="submit" className="h-8 rounded-full border border-ink-300 px-3 text-xs font-medium text-ink-700 hover:bg-ink-50">Apply</button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-ink-500">Nothing matches these filters.</p>
        ) : (
          <ol className="divide-y divide-ink-100">
            {rows.map((log) => (
              <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink-900">{describeAuditAction(log.action)}</p>
                  <p className="text-xs text-ink-500">{log.user?.name ?? "System"}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-500"><LocalTime value={log.createdAt} /></span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-ink-600">
        <span>{total === 0 ? "0 entries" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}</span>
        <span className="flex items-center gap-2">
          {page > 1 && <Link href={href({ page: String(page - 1) })} className="inline-flex items-center gap-1 rounded-full border border-ink-300 px-3 py-1 font-medium hover:bg-ink-50"><ChevronLeft size={14} aria-hidden /> Newer</Link>}
          {page < pages && <Link href={href({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-full border border-ink-300 px-3 py-1 font-medium hover:bg-ink-50">Older <ChevronRight size={14} aria-hidden /></Link>}
        </span>
      </div>
    </div>
  );
}
