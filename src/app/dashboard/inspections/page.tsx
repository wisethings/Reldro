import Link from "next/link";
import { QueryLink } from "@/components/ui/QueryLink";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { INSPECTION_KIND_LABEL } from "@/lib/safety/pack";
import { dayStartIn, startOfTodayUTC } from "@/lib/safety/dates";
import { repeatLabel } from "@/lib/safety/repeat";
import { Badge } from "@/components/ui/Badge";
import { dueLabel, fmtDate, PageHeader } from "@/components/safety/ui";
import { DataRow, DataTable } from "@/components/safety/Table";
import { ListToolbar } from "@/components/safety/ListToolbar";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { ChecklistMenu, NewChecklist, ScheduleInspectionButton, StarterTemplatesButton } from "@/components/safety/InspectionForms";
import { LIST_PAGE } from "@/components/ui/layout";

const DAY = 86400_000;
type View = "all" | "overdue" | "soon" | "done" | "checklists";

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; page?: string; new?: string }> }) {
  const sp = await searchParams;
  const v = await requireViewer();
  const canSchedule = v.isSafetyTeam || v.isSupervisor;
  const scope = v.isSafetyTeam ? {} : v.isSupervisor ? { siteId: v.siteId ?? "__none__" } : { assigneeId: v.employeeId ?? "__none__" };
  const org = { organizationId: v.organizationId, ...scope };
  const now = Date.now();
  // Overdue = a whole due day has passed; due soon = today through the next 7 days (same rule as every other page).
  const lateCut = startOfTodayUTC();
  const soonCut = dayStartIn(8);
  const d30 = new Date(now - 30 * DAY);
  const view: View = sp.view === "overdue" || sp.view === "soon" || sp.view === "done" || (sp.view === "checklists" && v.isSafetyTeam) ? sp.view : "all";
  const q = (sp.q ?? "").trim();
  const search = q ? { OR: [{ template: { name: { contains: q, mode: "insensitive" as const } } }, { site: { name: { contains: q, mode: "insensitive" as const } } }] } : {};

  const scheduled = { ...org, status: "SCHEDULED" };
  const [nAll, nLate, nSoon, nDone, nDone30, doneRows] = await Promise.all([
    prisma.inspection.count({ where: scheduled }),
    prisma.inspection.count({ where: { ...scheduled, dueDate: { lt: lateCut } } }),
    prisma.inspection.count({ where: { ...scheduled, dueDate: { gte: lateCut, lt: soonCut } } }),
    prisma.inspection.count({ where: { ...org, status: "COMPLETED" } }),
    prisma.inspection.count({ where: { ...org, status: "COMPLETED", completedAt: { gte: d30 } } }),
    prisma.inspection.findMany({ where: { ...org, status: "COMPLETED", completedAt: { gte: d30 } }, select: { results: true } }),
  ]);
  const sFailed = doneRows.reduce((n, r) => n + (r.results as { result: string }[]).filter((x) => x.result === "FAIL").length, 0);

  const [templates, sites, people] = await Promise.all([
    canSchedule ? prisma.inspectionTemplate.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canSchedule ? prisma.site.findMany({ where: { organizationId: v.organizationId, active: true, ...(v.isSafetyTeam ? {} : { id: v.siteId ?? "__none__" }) }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canSchedule ? prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
  ]);

  // The main list: scheduled work by default, or the full completed history.
  const listWhere =
    view === "done" ? { ...org, status: "COMPLETED", ...search }
    : view === "overdue" ? { ...scheduled, dueDate: { lt: lateCut }, ...search }
    : view === "soon" ? { ...scheduled, dueDate: { gte: lateCut, lt: soonCut }, ...search }
    : { ...scheduled, ...search };
  const inList = view !== "checklists";
  const total = inList ? await prisma.inspection.count({ where: listWhere }) : 0;
  const page = Math.min(readPage(sp.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const rows = inList
    ? await prisma.inspection.findMany({ where: listWhere, include: { template: true, site: true }, orderBy: view === "done" ? { completedAt: "desc" } : { dueDate: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })
    : [];
  const showPreview = view === "all" && !q;
  const recent = showPreview ? await prisma.inspection.findMany({ where: { ...org, status: "COMPLETED" }, include: { template: true, site: true }, orderBy: { completedAt: "desc" }, take: 5 }) : [];
  const assigneeIds = [...rows.map((r) => r.assigneeId), ...recent.map((r) => r.assigneeId)].filter((x): x is string => Boolean(x));
  const owners = assigneeIds.length ? await prisma.employee.findMany({ where: { id: { in: assigneeIds } }, include: { user: { select: { name: true } } } }) : [];
  const ownerName = new Map(owners.map((o) => [o.id, o.user.name]));

  const href = (over: Record<string, string | undefined>) => {
    const p2 = new URLSearchParams();
    const merged: Record<string, string | undefined> = { view: view === "all" ? undefined : view, q: q || undefined, ...over };
    for (const [k, val] of Object.entries(merged)) if (val) p2.set(k, val);
    const str = p2.toString();
    return str ? `?${str}` : "?";
  };
  const seg = (on: boolean) => `rounded-md px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.08)]" : "text-ink-600 hover:text-ink-900"}`;
  const failedCount = (r: unknown) => (r as { result: string }[]).filter((x) => x.result === "FAIL").length;
  const dueCell = (due: Date) => {
    const d = dueLabel(due, true);
    const today = d.text === "Due today";
    const soon = !d.overdue && due.getTime() < soonCut.getTime();
    return <span className={d.overdue ? "font-semibold text-danger" : today ? "font-semibold text-amber-deep" : soon ? "text-amber-deep" : "text-ink-500"}>{d.text}{!d.overdue && <span className="block text-xs font-normal text-ink-500">{fmtDate(due)}</span>}</span>;
  };

  return (
    <div className={LIST_PAGE}>
      <PageHeader
        title="Inspections"
        subtitle="Site inspections and job-start checks. Failed items can become corrective actions."
        actions={canSchedule && templates.length > 0 ? <ScheduleInspectionButton templates={templates.map((t) => ({ id: t.id, name: t.name }))} sites={sites.map((s) => ({ id: s.id, name: s.name }))} people={people.map((p) => ({ id: p.id, name: p.user.name, hint: p.jobTitle }))} defaultOpen={sp.new === "1"} /> : undefined}
      />

      <p className="surface flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs text-ink-600">
        <QueryLink href="?view=overdue" className="hover:text-ink-900"><span className={`mr-1 text-sm font-semibold tabular-nums ${nLate > 0 ? "text-danger" : "text-ink-900"}`}>{nLate}</span>overdue</QueryLink>
        <QueryLink href="?view=soon" className="hover:text-ink-900"><span className={`mr-1 text-sm font-semibold tabular-nums ${nSoon > 0 ? "text-amber-deep" : "text-ink-900"}`}>{nSoon}</span>due in the next 7 days</QueryLink>
        <QueryLink href="?view=done" className="hover:text-ink-900"><span className="mr-1 text-sm font-semibold tabular-nums text-ink-900">{nDone30}</span>completed in 30 days</QueryLink>
        <span><span className={`mr-1 text-sm font-semibold tabular-nums ${sFailed > 0 ? "text-danger" : "text-ink-900"}`}>{sFailed}</span>failed items in 30 days</span>
      </p>

      {inList ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter inspections" className="flex rounded-lg bg-ink-100 p-0.5 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <QueryLink scroll={false} href={href({ view: undefined, page: undefined })} className={seg(view === "all")}>All ({nAll})</QueryLink>
              <QueryLink scroll={false} href={href({ view: "overdue", page: undefined })} className={`${seg(view === "overdue")} ${view !== "overdue" && nLate > 0 ? "!text-danger" : ""}`}>Overdue ({nLate})</QueryLink>
              <QueryLink scroll={false} href={href({ view: "soon", page: undefined })} className={`${seg(view === "soon")} ${view !== "soon" && nSoon > 0 ? "!text-amber-deep" : ""}`}>Due soon ({nSoon})</QueryLink>
              <QueryLink scroll={false} href={href({ view: "done", page: undefined })} className={seg(view === "done")}>Completed ({nDone})</QueryLink>
            </div>
          </div>
          <ListToolbar searchParam="q" pageParam="page" placeholder="Search inspection or site" selects={[]} />

          {rows.length === 0 ? (
            q ? (
              <div className="surface border-dashed px-6 py-10 text-center"><p className="text-sm font-medium text-ink-900">No inspections match</p><p className="mt-1 text-sm text-ink-600">Try a different search, or <QueryLink href={href({ q: undefined })} className="font-medium text-orchid-deep hover:text-oxblood">clear it</QueryLink>.</p></div>
            ) : (
              <div className="surface px-6 py-10 text-center">
                <p className="text-sm font-medium text-ink-900">{view === "overdue" ? "Nothing is overdue" : view === "soon" ? "Nothing is due in the next 7 days" : view === "done" ? "No completed inspections yet" : "No inspections scheduled"}</p>
                <p className="mt-1 text-sm text-ink-600">{view === "all" ? (canSchedule ? "Schedule an inspection or create a checklist to get started." : "Inspections assigned to you will appear here.") : "Nice work."}</p>
                {view === "all" && canSchedule && templates.length === 0 && v.isSafetyTeam && <div className="mt-3 flex justify-center"><StarterTemplatesButton /></div>}
              </div>
            )
          ) : view === "done" ? (
            <DataTable columns={["Inspection", "Site", "Type", "Completed", "Result"]} template="minmax(0,1.2fr) minmax(0,1fr) 9rem 8rem 8rem">
              {rows.map((i) => {
                const failed = failedCount(i.results);
                return (
                  <DataRow key={i.id} href={`/dashboard/inspections/${i.id}`} template="minmax(0,1.2fr) minmax(0,1fr) 9rem 8rem 8rem"
                    main={<p className="truncate text-sm font-semibold text-ink-900">{i.template.name}</p>}
                    chips={<><span className="text-xs text-ink-500">{i.site.name} · {fmtDate(i.completedAt)}</span>{failed > 0 ? <Badge tone="red">{failed} failed</Badge> : <Badge tone="green">Passed</Badge>}</>}
                    cells={[<span key="s" className="line-clamp-2">{i.site.name}</span>, <span key="t" className="text-ink-500">{INSPECTION_KIND_LABEL[i.template.kind]}</span>, <span key="c" className="text-xs text-ink-500">{fmtDate(i.completedAt)}</span>, failed > 0 ? <Badge key="r" tone="red">{failed} failed</Badge> : <Badge key="r" tone="green">Passed</Badge>]}
                  />
                );
              })}
            </DataTable>
          ) : (
            <DataTable columns={["Inspection", "Site", "Type", "Owner", "Due"]} template="minmax(0,1.2fr) minmax(0,1fr) 9rem 9rem 8rem">
              {rows.map((i) => {
                const d = dueLabel(i.dueDate, true);
                const today = d.text === "Due today";
                return (
                  <DataRow key={i.id} href={`/dashboard/inspections/${i.id}`} tone={d.overdue ? "urgent" : today ? "warn" : undefined} template="minmax(0,1.2fr) minmax(0,1fr) 9rem 9rem 8rem"
                    main={<p className="truncate text-sm font-semibold text-ink-900">{i.template.name}</p>}
                    chips={<><span className="text-xs text-ink-500">{i.site.name}</span><span className={`text-xs ${d.overdue ? "font-semibold text-danger" : today ? "font-semibold text-amber-deep" : "text-ink-500"}`}>{d.text}</span></>}
                    cells={[<span key="s" className="line-clamp-2">{i.site.name}</span>, <span key="t" className="text-ink-500">{INSPECTION_KIND_LABEL[i.template.kind]}</span>, <span key="o" className={i.assigneeId ? "" : "text-ink-400"}>{i.assigneeId ? ownerName.get(i.assigneeId) ?? "Assigned" : "Anyone at the site"}</span>, <span key="d">{dueCell(i.dueDate)}</span>]}
                  />
                );
              })}
            </DataTable>
          )}
          <Pagination page={page} total={total} noun="inspections" hrefFor={(n) => href({ page: n > 1 ? String(n) : undefined })} />

          {showPreview && recent.length > 0 && (
            <details className="surface group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                <span>Recently completed <span className="font-normal text-ink-500">· {nDone}</span></span>
                <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <ul className="divide-y divide-ink-100 border-t border-ink-100">
                {recent.map((i) => {
                  const failed = failedCount(i.results);
                  return (
                    <li key={i.id}>
                      <Link href={`/dashboard/inspections/${i.id}`} className="flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-2 hover:bg-surface-hover">
                        <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink-900">{i.template.name}</span><span className="block truncate text-xs text-ink-500">{i.site.name} · {fmtDate(i.completedAt)}</span></span>
                        {failed > 0 ? <Badge tone="red">{failed} failed</Badge> : <Badge tone="green">Passed</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {nDone > recent.length && <div className="card-footer px-4 py-2"><QueryLink href="?view=done" className="text-xs font-medium text-orchid-deep hover:text-oxblood">View all completed →</QueryLink></div>}
            </details>
          )}
        </>
      ) : null}

      {v.isSafetyTeam && (view === "all" || view === "checklists") && !q && (
        <ChecklistSection templates={templates} full={view === "checklists"} pageParam={sp.page} />
      )}
    </div>
  );
}

function ChecklistSection({ templates, full, pageParam }: { templates: Awaited<ReturnType<typeof prisma.inspectionTemplate.findMany>>; full: boolean; pageParam: string | undefined }) {
  const preview = 5;
  const last = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const page = Math.min(readPage(pageParam), last);
  const shown = full ? templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : templates.slice(0, preview);
  const list = (
    <>
      <NewChecklist empty={templates.length === 0} />
      {templates.length > 0 && (
        <ul className="divide-y divide-ink-100">
          {shown.map((t) => {
            const rep = repeatLabel(t.frequencyDays);
            return (
              <li key={t.id} className="flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-1.5">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-900">{t.name}</p><p className="truncate text-xs text-ink-500">{INSPECTION_KIND_LABEL[t.kind]} · {(t.items as unknown[]).length} items{rep ? ` · ${rep.toLowerCase()}` : ""}</p></div>
                <ChecklistMenu template={{ id: t.id, name: t.name, kind: t.kind, frequencyDays: t.frequencyDays, items: t.items as { label: string; critical?: boolean }[] }} />
              </li>
            );
          })}
        </ul>
      )}
      {!full && templates.length > preview && <div className="card-footer px-4 py-2"><QueryLink href="?view=checklists" className="text-xs font-medium text-orchid-deep hover:text-oxblood">View all {templates.length} checklists →</QueryLink></div>}
    </>
  );
  if (full) {
    return (
      <section aria-labelledby="checklists" className="space-y-3">
        <div className="flex items-center justify-between"><h2 id="checklists" className="text-sm font-semibold text-ink-900">Checklists <span className="font-normal text-ink-500">· {templates.length}</span></h2><QueryLink href="?" className="text-xs font-medium text-orchid-deep hover:text-oxblood">← Back to inspections</QueryLink></div>
        <div className="surface">{list}</div>
        <Pagination page={page} total={templates.length} noun="checklists" hrefFor={(n) => `?view=checklists${n > 1 ? `&page=${n}` : ""}`} />
      </section>
    );
  }
  return (
    <details className="surface group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-ink-900 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
        <span>Checklists <span className="font-normal text-ink-500">· {templates.length}</span></span>
        <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-ink-100">{list}</div>
    </details>
  );
}
