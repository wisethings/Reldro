import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { getPack } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, fmtDate, PageHeader } from "@/components/safety/ui";
import { StatStrip } from "@/components/safety/Dashboard";
import { Pagination, readPage } from "@/components/safety/Pagination";
import { TalkContent } from "@/components/safety/TalkContent";
import { AcknowledgeButton, DeleteQualificationButton, QualificationForm, TalkForm, TalkMenu } from "@/components/safety/TrainingForms";
import { ListToolbar } from "@/components/safety/ListToolbar";
import { PersonAccess, PersonAssignment, PersonMenu } from "@/components/team/PeopleControls";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string; q?: string; page?: string; new?: string; pq?: string; psite?: string; pcrew?: string; pacc?: string; psort?: string; ppage?: string }> }) {
  const v = await requireViewer();
  const sp = await searchParams;
  const { tab = "talks", filter: f, q, page: pageParam, new: newParam } = sp;
  const createOpen = newParam === "1";
  const pack = getPack();
  const canManage = v.isSafetyTeam || v.isSupervisor;
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86400_000);

  const tabs = [["talks", v.isSafetyTeam || v.isSupervisor ? "Toolbox talks" : "Toolbox talks"], ...(canManage ? [["qualifications", "Qualifications"]] : [["mine", "My qualifications"]]), ...(v.isAdmin ? [["people", "People"]] : [])];
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-surface-hover"}`;
  const activeTab = tabs.some(([k]) => k === tab) ? tab : "talks";

  const sites = await prisma.site.findMany({ where: { organizationId: v.organizationId, active: true }, orderBy: { name: "asc" } });

  let body: React.ReactNode = null;

  if (activeTab === "talks") {
    const talks = await prisma.toolboxTalk.findMany({
      where: { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { OR: [{ siteId: null }, { siteId: v.siteId ?? "__none__" }] }) },
      include: { acknowledgements: { select: { employeeId: true } } },
      orderBy: { scheduledFor: "desc" },
      take: 200,
    });
    const employees = await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } } });
    const lessons = await prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 6 });

    type Row = { t: (typeof talks)[number]; status: "needs" | "upcoming" | "completed"; audience: number; acked: number; missing: string[]; mineDone: boolean; where: string };
    const rows: Row[] = talks.map((t) => {
      const audience = employees.filter((e) => !t.siteId || e.siteId === t.siteId);
      const ackIds = new Set(t.acknowledgements.map((a) => a.employeeId));
      const mineDone = v.employeeId ? ackIds.has(v.employeeId) : false;
      const complete = canManage ? audience.length > 0 && audience.every((e) => ackIds.has(e.id)) : mineDone;
      const status: Row["status"] = t.scheduledFor > now ? "upcoming" : complete ? "completed" : "needs";
      return { t, status, audience: audience.length, acked: audience.filter((e) => ackIds.has(e.id)).length, missing: audience.filter((e) => !ackIds.has(e.id)).map((e) => e.user.name), mineDone, where: t.siteId ? sites.find((s) => s.id === t.siteId)?.name ?? "One site" : "Whole company" };
    });
    const counts = { all: rows.length, needs: rows.filter((r) => r.status === "needs").length, upcoming: rows.filter((r) => r.status === "upcoming").length, completed: rows.filter((r) => r.status === "completed").length };
    const filter = f === "needs" || f === "upcoming" || f === "completed" ? f : "all";
    const term = (q ?? "").trim().toLowerCase();
    const matches = rows.filter((r) => (filter === "all" || r.status === filter) && (!term || `${r.t.title} ${r.t.createdByName}`.toLowerCase().includes(term)));
    // Lowest coverage first, so the talks that most need a nudge lead the page.
    const featured = filter === "all" && !term ? rows.filter((r) => r.status === "needs").sort((a, b) => (a.acked / Math.max(1, a.audience)) - (b.acked / Math.max(1, b.audience))).slice(0, 3) : [];
    const featuredIds = new Set(featured.map((r) => r.t.id));
    const rest = matches.filter((r) => !featuredIds.has(r.t.id));
    const perPage = 12;
    const page = Math.min(readPage(pageParam), Math.max(1, Math.ceil(rest.length / perPage)));
    const pageRows = rest.slice((page - 1) * perPage, page * perPage);
    const href = (over: Record<string, string | undefined>) => {
      const sp = new URLSearchParams();
      const merged: Record<string, string | undefined> = { tab: "talks", filter: filter === "all" ? undefined : filter, q: term || undefined, page: undefined, ...over };
      for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
      return `?${sp.toString()}`;
    };
    const seg = (on: boolean) => `rounded-md px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-white text-ink-900 shadow-[0_0_0_1px_rgba(42,10,12,0.08)]" : "text-ink-600 hover:text-ink-900"}`;
    const STATUS = { needs: { label: "Needs acknowledgment", tone: "gold" as const }, upcoming: { label: "Upcoming", tone: "sky" as const }, completed: { label: "Completed", tone: "green" as const } };

    const TalkRow = ({ r }: { r: Row }) => {
      const st = STATUS[r.status];
      const pct = r.audience ? Math.round((r.acked / r.audience) * 100) : 0;
      return (
        <li>
          <details className="group open:expand-band">
            <summary className={`grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${canManage ? "md:grid-cols-[minmax(0,1fr)_9.5rem_10.5rem_8rem]" : "md:grid-cols-[minmax(0,1fr)_auto_6.5rem]"} [&::-webkit-details-marker]:hidden`}>
              <div className="min-w-0">
                <p title={r.t.title} className="truncate text-sm font-semibold text-ink-900">{r.t.title}</p>
                <p className="mt-0.5 truncate text-xs text-ink-500">{fmtDate(r.t.scheduledFor)} · {r.where} · {r.t.createdByName}{r.t.aiDrafted ? " · AI-assisted, reviewed" : ""}</p>
              </div>
              {canManage ? (
                <div className="order-3 col-span-2 flex items-center gap-2 md:order-none md:col-span-1" title={`${r.acked} of ${r.audience} acknowledged`}>
                  <span aria-hidden className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-ink-100"><span className={`block h-full rounded-full ${pct === 100 ? "bg-sage-deep" : "bg-orchid-deep"}`} style={{ width: `${pct}%` }} /></span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-600">{r.acked} of {r.audience}</span>
                </div>
              ) : null}
              <div className="order-2 md:order-none"><Badge tone={st.tone}>{r.status === "needs" && !canManage ? "Needs acknowledgment" : st.label}</Badge></div>
              <div className="order-4 col-span-2 flex justify-start md:order-none md:col-span-1 md:justify-end">
                {!canManage && r.status === "needs" && v.employeeId ? <AcknowledgeButton talkId={r.t.id} compact /> : <span className="text-xs font-medium text-orchid-deep group-hover:text-oxblood group-open:hidden">View talk →</span>}
              </div>
            </summary>
            <div className="expand-panel mx-3 mb-3 mt-0.5 px-4 py-5 sm:mx-4 sm:px-6 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <TalkContent content={r.t.content} />
                {canManage && <TalkMenu talkId={r.t.id} />}
              </div>
              <div className="mt-6 max-w-[46rem] border-t border-ink-100 pt-4">
                {canManage ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="text-sm font-semibold text-ink-900">{r.acked} of {r.audience} acknowledged</p>
                      {v.employeeId && (r.mineDone ? <Badge tone="green">You acknowledged this</Badge> : <AcknowledgeButton talkId={r.t.id} />)}
                    </div>
                    <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200/70"><div className={`h-full rounded-full ${r.acked === r.audience ? "bg-sage-deep" : "bg-orchid-deep"}`} style={{ width: `${r.audience ? Math.round((r.acked / r.audience) * 100) : 0}%` }} /></div>
                    {r.missing.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs text-ink-600">Still to acknowledge</p>
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {r.missing.slice(0, 12).map((n) => <li key={n} className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-800 ring-1 ring-ink-200">{n}</li>)}
                          {r.missing.length > 12 && <li className="px-1 py-1 text-xs text-ink-500">and {r.missing.length - 12} more</li>}
                        </ul>
                      </div>
                    ) : <p className="mt-3 text-xs text-sage-deep">Everyone in scope has acknowledged this talk.</p>}
                  </>
                ) : (
                  v.employeeId && (r.mineDone ? <Badge tone="green">You acknowledged this</Badge> : (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <p className="text-xs text-ink-600">By acknowledging, you confirm you attended and understood this talk.</p>
                      <AcknowledgeButton talkId={r.t.id} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>
        </li>
      );
    };

    body = (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter talks" className="flex rounded-lg bg-ink-100 p-0.5">
            <Link href={href({ filter: undefined })} className={seg(filter === "all")}>All</Link>
            <Link href={href({ filter: "needs" })} className={seg(filter === "needs")}>Needs acknowledgment{counts.needs > 0 ? ` (${counts.needs})` : ""}</Link>
            <Link href={href({ filter: "upcoming" })} className={seg(filter === "upcoming")}>Upcoming</Link>
            <Link href={href({ filter: "completed" })} className={seg(filter === "completed")}>Completed</Link>
          </div>
          <form role="search" className="min-w-[10rem] flex-1 sm:max-w-xs">
            <input type="hidden" name="tab" value="talks" />
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <label className="sr-only" htmlFor="talk-search">Search talks</label>
            <input id="talk-search" name="q" defaultValue={q ?? ""} type="search" placeholder="Search talks" className="h-8 w-full rounded-lg border border-ink-200 bg-white px-2.5 text-xs outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
          </form>
        </div>

        {canManage && (
          <details className="group surface" open={createOpen}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-semibold text-ink-900">Create toolbox talk</span>
                <span className="block text-xs text-ink-500">A short safety talk your crews acknowledge. AI can draft an outline from approved material.</span>
              </span>
              <span className="shrink-0 rounded-full bg-brand-700 px-4 py-1.5 text-xs font-medium text-white group-open:hidden">New talk</span>
            </summary>
            <div className="border-t border-ink-100 px-4 py-4"><TalkForm sites={sites.map((s) => ({ id: s.id, name: s.name }))} lockSiteId={v.isSafetyTeam ? null : v.siteId} /></div>
          </details>
        )}

        {rows.length === 0 ? (
          <EmptyState title="No toolbox talks yet" body={canManage ? "Create your first toolbox talk above." : "When your supervisor shares a toolbox talk, it will appear here."} />
        ) : (
          <>
            {featured.length > 0 && (
              <section aria-labelledby="needs-attention">
                <h2 id="needs-attention" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900"><span aria-hidden className="h-2 w-2 rounded-full bg-amber-deep" />Needs attention</h2>
                <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border-l-2 border-amber-deep/70 bg-white">{featured.map((r) => <TalkRow key={r.t.id} r={r} />)}</ul>
              </section>
            )}
            <section aria-labelledby="all-talks">
              <h2 id="all-talks" className={`mb-2 text-sm ${featured.length > 0 ? "font-medium text-ink-600" : "font-semibold text-ink-900"}`}>{filter === "all" ? "All toolbox talks" : STATUS[filter].label}</h2>
              {pageRows.length === 0 ? (
                <p className="surface px-4 py-8 text-center text-sm text-ink-600">{featured.length > 0 ? "No other talks." : "No talks match."} {(filter !== "all" || term) && <Link href="?tab=talks" className="font-medium text-orchid-deep hover:text-oxblood">Show all talks</Link>}</p>
              ) : (
                <ul className="divide-y divide-ink-100 overflow-hidden surface">{pageRows.map((r) => <TalkRow key={r.t.id} r={r} />)}</ul>
              )}
              <div className="mt-3"><Pagination page={page} total={rest.length} pageSize={perPage} noun="talks" hrefFor={(n) => href({ page: n > 1 ? String(n) : undefined })} /></div>
            </section>
          </>
        )}

        {lessons.length > 0 && (
          <details className="group surface">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-medium text-ink-700 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
              <span>Related: lessons from recent incidents <span className="font-normal text-ink-500">· {lessons.length}</span></span>
              <span aria-hidden className="text-ink-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {lessons.map((l) => <li key={l.id} className="px-4 py-3 text-sm text-ink-800"><span className="mr-2 rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink-600">{pack.categories.find((c) => c.key === l.report.category)?.label ?? "Other"}</span>{l.lessonText}</li>)}
            </ul>
            <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">Approved for sharing with your team. The safety team removes personal details before publishing.</p>
          </details>
        )}
      </div>
    );
  } else if (activeTab === "qualifications" || activeTab === "mine") {
    const scope = canManage
      ? v.isSafetyTeam ? {} : { employeeId: { in: (await prisma.employee.findMany({ where: { organizationId: v.organizationId, siteId: v.siteId ?? "__none__" }, select: { id: true } })).map((e) => e.id) } }
      : { employeeId: v.employeeId ?? "__none__" };
    const [quals, people] = await Promise.all([
      prisma.qualification.findMany({ where: { organizationId: v.organizationId, ...scope }, orderBy: [{ expiresOn: "asc" }] }),
      canManage ? prisma.employee.findMany({ where: { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { siteId: v.siteId ?? "__none__" }) }, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
    ]);
    const names = new Map((await prisma.employee.findMany({ where: { id: { in: quals.map((q) => q.employeeId) } }, include: { user: { select: { name: true } } } })).map((e) => [e.id, e.user.name]));
    body = (
      <div className="space-y-5">
        {canManage && (
          <Card tone="plain">
            <CardHeader title="Record a qualification" subtitle="Record certifications and authorizations with an expiry date. Reldro flags them 30 days before they expire." />
            <CardBody><QualificationForm people={people.map((p) => ({ id: p.id, name: p.user.name }))} suggestions={pack.qualificationSuggestions} /></CardBody>
          </Card>
        )}
        {quals.length === 0 ? (
          <EmptyState title="No qualifications recorded" body={canManage ? "Add the certifications your crews need, such as aerial lift, first aid, or OSHA 30, so expiry dates are not missed." : "Your supervisor records your certifications."} />
        ) : (
          <Card tone="plain">
            <ul className="divide-y divide-ink-200">
              {quals.map((q) => {
                const expired = q.expiresOn && q.expiresOn < now;
                const soon = q.expiresOn && !expired && q.expiresOn <= in30;
                return (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                    <div><p className="text-sm font-medium text-ink-900">{canManage ? `${names.get(q.employeeId) ?? "Someone"} · ` : ""}{q.name}</p><p className="text-xs text-ink-500">{q.issuedOn ? `Issued ${fmtDate(q.issuedOn)} · ` : ""}{q.expiresOn ? `Expires ${fmtDate(q.expiresOn)}` : "No expiry"}</p></div>
                    <div className="flex items-center gap-3">{expired ? <Badge tone="red">Expired</Badge> : soon ? <Badge tone="gold">Expires soon</Badge> : <Badge tone="green">Current</Badge>}{canManage && <DeleteQualificationButton id={q.id} />}</div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    );
  } else if (activeTab === "people" && v.isAdmin) {
    const [everyone, crews] = await Promise.all([
      prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: true, department: true }, orderBy: { user: { name: "asc" } } }),
      prisma.department.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }),
    ]);
    const siteName = new Map(sites.map((s) => [s.id, s.name]));
    const pq = (sp.pq ?? "").trim().toLowerCase();
    const acc = sp.pacc === "supervisor" || sp.pacc === "lead" || sp.pacc === "pending" ? sp.pacc : "";
    const psort = sp.psort === "site" || sp.psort === "recent" || sp.psort === "access" ? sp.psort : "name";
    const accessRank = (e: (typeof everyone)[number]) => (e.isSafetyLead ? 0 : e.isDepartmentAdmin ? 1 : 2);
    const people = everyone
      .filter((e) =>
        (!pq || `${e.user.name} ${e.user.email} ${e.jobTitle}`.toLowerCase().includes(pq)) &&
        (!sp.psite || (sp.psite === "none" ? !e.siteId : e.siteId === sp.psite)) &&
        (!sp.pcrew || (sp.pcrew === "none" ? !e.departmentId : e.departmentId === sp.pcrew)) &&
        (acc === "" || (acc === "supervisor" ? e.isDepartmentAdmin : acc === "lead" ? e.isSafetyLead : e.user.lastLoginAt === null)),
      )
      .sort((a, b) =>
        psort === "site" ? (siteName.get(a.siteId ?? "") ?? "zzz").localeCompare(siteName.get(b.siteId ?? "") ?? "zzz") || a.user.name.localeCompare(b.user.name)
        : psort === "recent" ? b.createdAt.getTime() - a.createdAt.getTime()
        : psort === "access" ? accessRank(a) - accessRank(b) || a.user.name.localeCompare(b.user.name)
        : a.user.name.localeCompare(b.user.name),
      );
    const peoplePerPage = 20;
    const ppage = Math.min(readPage(sp.ppage), Math.max(1, Math.ceil(people.length / peoplePerPage)));
    const pagePeople = people.slice((ppage - 1) * peoplePerPage, ppage * peoplePerPage);
    const pHref = (n: number) => {
      const q2 = new URLSearchParams({ tab: "people" });
      for (const k of ["pq", "psite", "pcrew", "pacc", "psort"] as const) if (sp[k]) q2.set(k, sp[k]!);
      if (n > 1) q2.set("ppage", String(n));
      return `?${q2.toString()}`;
    };
    const siteOpts = sites.map((s) => ({ id: s.id, name: s.name }));
    const crewOpts = crews.map((c) => ({ id: c.id, name: c.name }));
    const pending = everyone.filter((e) => e.user.lastLoginAt === null).length;
    const filteredPeople = Boolean(pq || sp.psite || sp.pcrew || acc);
    body = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink-900">People <span className="font-normal tabular-nums text-ink-500">{everyone.length}{pending > 0 ? ` · ${pending} invite${pending === 1 ? "" : "s"} pending` : ""}</span></h2>
            <p className="text-xs text-ink-500">Supervisors see their own site. Safety leads see every report and investigation. Only company admins change these roles.</p>
          </div>
        </div>
        <details className="group" open={sp.new === "person"}>
          <summary className="inline-flex cursor-pointer list-none items-center rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 group-open:hidden [&::-webkit-details-marker]:hidden">Invite person</summary>
          <div className="expand-panel p-4 sm:p-5">
            <div className="mb-3 border-b border-ink-100 pb-3">
              <h3 className="text-sm font-semibold text-ink-900">Invite a person</h3>
              <p className="text-xs text-ink-500">They receive a temporary password by email. If email is not set up, you can share it with them directly.</p>
            </div>
            <InviteEmployeeForm crews={crewOpts} sites={siteOpts} />
          </div>
        </details>

        <ListToolbar
          searchParam="pq"
          pageParam="ppage"
          placeholder="Search name, email or job title"
          selects={[
            { param: "psite", label: "All sites", options: [...siteOpts.map((s) => ({ value: s.id, label: s.name })), { value: "none", label: "No home site" }] },
            { param: "pcrew", label: "All crews", options: [...crewOpts.map((c) => ({ value: c.id, label: c.name })), { value: "none", label: "No crew" }] },
            { param: "pacc", label: "Any access", options: [{ value: "supervisor", label: "Supervisors" }, { value: "lead", label: "Safety leads" }, { value: "pending", label: "Invite pending" }] },
          ]}
          sort={{ param: "psort", label: "Sort people", options: [{ value: "", label: "Name" }, { value: "site", label: "Site" }, { value: "access", label: "Access" }, { value: "recent", label: "Recently added" }] }}
        />

        {people.length === 0 ? (
          <div className="surface border-dashed px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink-900">{filteredPeople ? "No one matches these filters" : "No people yet"}</p>
            <p className="mt-1 text-sm text-ink-600">{filteredPeople ? "Try a different search, or clear the filters." : "Invite your first person above."}</p>
            {filteredPeople && <Link href="?tab=people" className="mt-3 inline-block text-sm font-medium text-orchid-deep hover:text-oxblood">Clear filters</Link>}
          </div>
        ) : (
          <div className="surface">
            <div className="sticky top-0 z-10 hidden items-center gap-4 rounded-t-xl border-b border-ink-200 bg-ink-100 px-4 py-2 text-xs font-medium text-ink-700 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_11rem_2rem]">
              <span>Person</span><span>Site and crew</span><span>Access</span><span className="sr-only">Actions</span>
            </div>
            <ul className="divide-y divide-ink-100">
              {pagePeople.map((p) => (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl hover:bg-surface-hover/50 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_11rem_2rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p.user.name} size={32} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900">{p.user.name}{p.user.lastLoginAt === null && <Badge tone="amber">Invite pending</Badge>}</p>
                      <p className="truncate text-xs text-ink-500">{p.jobTitle} · {p.user.email}</p>
                    </div>
                  </div>
                  <div className="order-3 col-span-2 md:order-none md:col-span-1"><PersonAssignment employeeId={p.id} siteId={p.siteId} crewId={p.departmentId} sites={siteOpts} crews={crewOpts} /></div>
                  <div className="order-4 col-span-2 md:order-none md:col-span-1"><PersonAccess employeeId={p.id} isSupervisor={p.isDepartmentAdmin} isSafetyLead={p.isSafetyLead} /></div>
                  <div className="justify-self-end md:order-none"><PersonMenu userId={p.userId} employeeId={p.id} name={p.user.name} jobTitle={p.jobTitle} isSupervisor={p.isDepartmentAdmin} isSafetyLead={p.isSafetyLead} pendingInvite={p.user.lastLoginAt === null} isSelf={p.userId === v.userId} /></div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Pagination page={ppage} total={people.length} pageSize={peoplePerPage} noun="people" hrefFor={pHref} />
      </div>
    );
  }

  const t30 = new Date(Date.now() - 30 * 86400_000);
  const staffScope = v.isSafetyTeam ? {} : { employeeId: { in: (await prisma.employee.findMany({ where: { organizationId: v.organizationId, siteId: v.siteId ?? "__none__" }, select: { id: true } })).map((e) => e.id) } };
  const [nTalks, nAcks, nPeople, nExpiring, nExpired] = canManage
    ? await Promise.all([
        prisma.toolboxTalk.count({ where: { organizationId: v.organizationId, scheduledFor: { gte: t30 } } }),
        prisma.talkAcknowledgement.count({ where: { talk: { organizationId: v.organizationId, scheduledFor: { gte: t30 } } } }),
        prisma.employee.count({ where: { organizationId: v.organizationId } }),
        prisma.qualification.count({ where: { organizationId: v.organizationId, expiresOn: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400_000) }, ...staffScope } }),
        prisma.qualification.count({ where: { organizationId: v.organizationId, expiresOn: { lt: new Date() }, ...staffScope } }),
      ])
    : [0, 0, 0, 0, 0];
  const ackRate = nTalks > 0 && nPeople > 0 ? Math.min(100, Math.round((nAcks / (nTalks * nPeople)) * 100)) : null;

  return (
    <div className="min-h-full bg-surface-muted">
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6">
      <PageHeader title={v.isAdmin || v.isSafetyTeam ? "People & Training" : v.isSupervisor ? "Training" : "Toolbox talks"} subtitle={canManage ? "Manage worker qualifications, toolbox talks, and training acknowledgements." : "Toolbox talks shared with your team, and your acknowledgements."} />
      {canManage && (
        <StatStrip items={[
          { label: "Toolbox talks in the last 30 days", value: nTalks, href: "?tab=talks" },
          { label: "Acknowledged, last 30 days", value: ackRate === null ? "—" : `${ackRate}%`, href: "?tab=talks&filter=needs" },
          { label: "Qualifications expiring in 30 days", value: nExpiring, href: "?tab=qualifications" },
          { label: "Qualifications expired", value: nExpired, href: "?tab=qualifications", alert: nExpired > 0 },
        ]} />
      )}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map(([k, label]) => <Link key={k} href={`?tab=${k}`} className={chip(activeTab === k)}>{label}</Link>)}
        </div>
      )}
      {body}
    </div>
    </div>
  );
}
