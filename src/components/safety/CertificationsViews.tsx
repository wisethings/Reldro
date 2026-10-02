import Link from "next/link";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/safety/access";
import { coverage, requirementsFor, STATE_LABEL, type CertState, type Requirement } from "@/lib/safety/certifications";
import { Badge } from "@/components/ui/Badge";
import { StatStrip } from "@/components/safety/Dashboard";
import { ListToolbar } from "@/components/safety/ListToolbar";
import { paginate, Pagination } from "@/components/safety/Pagination";
import { CertificationCatalog } from "@/components/safety/CertificationForms";
import { fmtDate } from "@/components/safety/ui";

type SP = Record<string, string | undefined>;

/** People, sites, crews, catalog and records this person may see: the safety team everything, a supervisor their own site. */
export async function loadCertData(v: Viewer) {
  const peopleWhere = { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { siteId: v.siteId ?? "__none__" }) };
  const [people, sites, crews, types] = await Promise.all([
    prisma.employee.findMany({ where: peopleWhere, include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.site.findMany({ where: { organizationId: v.organizationId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.certificationType.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }),
  ]);
  const records = await prisma.qualification.findMany({ where: { organizationId: v.organizationId, employeeId: { in: people.map((p) => p.id) } } });
  return { people, sites, crews, types, records };
}
export type CertData = Awaited<ReturnType<typeof loadCertData>>;

const stateTone: Record<CertState, "red" | "amber" | "green" | "neutral"> = { missing: "neutral", expired: "red", expiring: "amber", valid: "green" };
export const StateBadge = ({ state }: { state: CertState }) => <Badge tone={stateTone[state]}>{STATE_LABEL[state]}</Badge>;

function Bar({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <span className="text-xs text-ink-500">None required</span>;
  const tone = pct >= 95 ? "bg-sage-deep" : pct >= 75 ? "bg-amber-deep" : "bg-danger";
  return (
    <span className="flex items-center gap-2">
      <span role="img" aria-label={`${label}: ${pct}% compliant`} className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-ink-100 sm:w-32"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} /></span>
      <span className="w-9 text-right text-xs font-medium tabular-nums text-ink-900">{pct}%</span>
    </span>
  );
}

function CoverageList({ title, rows }: { title: string; rows: { key: string; name: string; c: ReturnType<typeof coverage> }[] }) {
  return (
    <section className="surface overflow-hidden">
      <h3 className="border-b border-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-900">{title}</h3>
      {rows.length === 0 ? <p className="px-4 py-4 text-sm text-ink-500">Nothing to show yet.</p> : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-medium text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.c.required === 0 ? "No requirements" : `${r.c.compliant} of ${r.c.required} compliant${r.c.missing + r.c.expired > 0 ? ` · ${r.c.missing + r.c.expired} gap${r.c.missing + r.c.expired === 1 ? "" : "s"}` : ""}`}</p>
              </div>
              <Bar pct={r.c.pct} label={r.name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Who is missing, expired or about to expire against what the company requires. */
export async function ComplianceView({ v, sp, data }: { v: Viewer; sp: SP; data: CertData }) {
  const { people, sites, crews, types, records } = data;
  const reqs = requirementsFor(types, people.map((p) => ({ id: p.id, siteId: p.siteId, departmentId: p.departmentId })), records);
  const total = coverage(reqs);
  const person = new Map(people.map((p) => [p.id, p]));
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const crewName = new Map(crews.map((c) => [c.id, c.name]));

  const group = (keyOf: (r: Requirement) => string | null, names: Map<string, string>, none: string) => {
    const by = new Map<string, Requirement[]>();
    for (const r of reqs) { const k = keyOf(r) ?? "__none"; by.set(k, [...(by.get(k) ?? []), r]); }
    return [...by.entries()].map(([k, list]) => ({ key: k, name: k === "__none" ? none : names.get(k) ?? "Unknown", c: coverage(list) })).sort((a, b) => (a.c.pct ?? 101) - (b.c.pct ?? 101) || a.name.localeCompare(b.name));
  };
  const byType = types.filter((t) => t.requiredScope !== "NONE").map((t) => ({ key: t.id, name: t.name, c: coverage(reqs.filter((r) => r.typeId === t.id)) })).sort((a, b) => (a.c.pct ?? 101) - (b.c.pct ?? 101) || a.name.localeCompare(b.name));
  const bySite = group((r) => person.get(r.employeeId)?.siteId ?? null, siteName, "No site");
  const byCrew = group((r) => person.get(r.employeeId)?.departmentId ?? null, crewName, "No crew");

  // Gap list with filters.
  const q = (sp.gq ?? "").trim().toLowerCase();
  const gstate = sp.gstate === "missing" || sp.gstate === "expired" || sp.gstate === "expiring" ? sp.gstate : "";
  const gaps = reqs
    .filter((r) => r.state !== "valid")
    .filter((r) => !gstate || r.state === gstate)
    .filter((r) => !sp.gtype || r.typeId === sp.gtype)
    .filter((r) => { const p = person.get(r.employeeId)!; return (!sp.gsite || (sp.gsite === "none" ? !p.siteId : p.siteId === sp.gsite)) && (!sp.gcrew || (sp.gcrew === "none" ? !p.departmentId : p.departmentId === sp.gcrew)); })
    .filter((r) => !q || `${person.get(r.employeeId)!.user.name} ${typeName.get(r.typeId) ?? ""}`.toLowerCase().includes(q));
  const rank: Record<CertState, number> = { expired: 0, missing: 1, expiring: 2, valid: 3 };
  gaps.sort((a, b) => rank[a.state] - rank[b.state] || person.get(a.employeeId)!.user.name.localeCompare(person.get(b.employeeId)!.user.name));
  const pg = paginate(gaps, sp.gpage);
  const gapHref = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ tab: "qualifications", cview: "compliance" });
    for (const [k, val] of Object.entries({ gq: sp.gq, gstate: sp.gstate, gtype: sp.gtype, gsite: sp.gsite, gcrew: sp.gcrew, ...over })) if (val) p.set(k, val);
    return `?${p.toString()}`;
  };

  if (types.every((t) => t.requiredScope === "NONE")) {
    return (
      <div className="surface border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink-900">Nothing is required yet</p>
        <p className="mx-auto mt-1 max-w-[46ch] text-sm text-ink-600">Say which certifications each site or crew must hold and this page shows who is missing, expired or about to expire.</p>
        {v.isSafetyTeam && <Link href="?tab=qualifications&cview=requirements" className="mt-4 inline-block rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800">Set requirements</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StatStrip
        items={[
          { label: "Required certifications held", value: total.pct === null ? "—" : `${total.pct}%`, alert: total.pct !== null && total.pct < 75 },
          { label: "Missing", value: total.missing, href: gapHref({ gstate: "missing", gpage: undefined }), alert: total.missing > 0 },
          { label: "Expired", value: total.expired, href: gapHref({ gstate: "expired", gpage: undefined }), alert: total.expired > 0 },
          { label: "Expiring in 30 days", value: total.expiring, href: gapHref({ gstate: "expiring", gpage: undefined }) },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <CoverageList title="By certification" rows={byType} />
        <div className="space-y-4">
          <CoverageList title="By site" rows={bySite} />
          <CoverageList title="By crew" rows={byCrew} />
        </div>
      </div>

      <section aria-labelledby="gaps" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="gaps" className="text-sm font-semibold text-ink-900">Gaps to close</h2>
            <p className="text-xs text-ink-500">Required certifications that are missing, expired or expiring within 30 days.</p>
          </div>
          {v.isSafetyTeam && (
            <a href="/api/safety/export/certifications?kind=gaps" download className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 hover:bg-surface-hover"><Download size={15} aria-hidden />Export gaps</a>
          )}
        </div>
        <ListToolbar
          searchParam="gq"
          pageParam="gpage"
          placeholder="Search person or certification"
          selects={[
            { param: "gstate", label: "Any status", options: [{ value: "missing", label: "Missing" }, { value: "expired", label: "Expired" }, { value: "expiring", label: "Expiring soon" }] },
            { param: "gtype", label: "All certifications", noun: "certification", options: types.filter((t) => t.requiredScope !== "NONE").map((t) => ({ value: t.id, label: t.name })) },
            { param: "gsite", label: "All sites", noun: "site", options: sites.map((s) => ({ value: s.id, label: s.name })) },
            { param: "gcrew", label: "All crews", noun: "crew", options: crews.map((c) => ({ value: c.id, label: c.name })) },
          ]}
        />
        {gaps.length === 0 ? (
          <div className="surface px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink-900">{reqs.some((r) => r.state !== "valid") ? "No gaps match" : "No gaps"}</p>
            <p className="mt-1 text-sm text-ink-600">{reqs.some((r) => r.state !== "valid") ? "Try a different search, or clear the filters." : "Everyone holds what they are required to hold."}</p>
          </div>
        ) : (
          <ul className="surface divide-y divide-ink-100 overflow-hidden">
            {pg.rows.map((r) => {
              const p = person.get(r.employeeId)!;
              const sub = [p.jobTitle, siteName.get(p.siteId ?? ""), crewName.get(p.departmentId ?? "")].filter(Boolean).join(" · ");
              return (
                <li key={`${r.employeeId}-${r.typeId}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 border-l-2 px-4 py-2.5 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_6.5rem_8.5rem] md:gap-x-4 ${r.state === "expired" ? "border-l-danger" : r.state === "expiring" ? "border-l-amber-deep/70" : "border-l-transparent"}`}>
                  <div className="min-w-0 flex-1 basis-56 md:basis-auto">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.user.name}</p>
                    <p className="truncate text-xs text-ink-500">{sub}</p>
                  </div>
                  <div className="min-w-0 flex-1 basis-44 md:basis-auto">
                    <p className="truncate text-sm text-ink-900">{typeName.get(r.typeId)}</p>
                    <p className="text-xs text-ink-500">{r.record?.expiresOn ? `${r.state === "expired" ? "Expired" : "Expires"} ${fmtDate(r.record.expiresOn)}` : r.state === "missing" ? "No record" : ""}</p>
                  </div>
                  <span className="md:justify-self-start"><StateBadge state={r.state} /></span>
                  {v.isSafetyTeam || v.isSupervisor ? (
                    <Link href={`?tab=qualifications&cview=records&remp=${r.employeeId}&rtype=${r.typeId}#record`} className="shrink-0 text-xs font-medium text-orchid-deep hover:text-oxblood md:justify-self-end">{r.state === "expiring" || r.state === "expired" ? "Record renewal" : "Record"} →</Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={pg.page} total={gaps.length} noun="gaps" hrefFor={(n) => gapHref({ gpage: n > 1 ? String(n) : undefined })} />
      </section>
    </div>
  );
}

/** The catalog of tracked certifications and who must hold each (safety team edits; others read). */
export async function RequirementsView({ v, data }: { v: Viewer; data: CertData }) {
  const { people, sites, crews, types, records } = data;
  const reqs = requirementsFor(types, people.map((p) => ({ id: p.id, siteId: p.siteId, departmentId: p.departmentId })), records);
  const siteName = new Map(sites.map((s) => [s.id, s.name]));
  const crewName = new Map(crews.map((c) => [c.id, c.name]));
  const rows = types.map((t) => {
    const c = coverage(reqs.filter((r) => r.typeId === t.id));
    const names = [...t.requiredSiteIds.map((id) => siteName.get(id)), ...t.requiredCrewIds.map((id) => crewName.get(id))].filter(Boolean) as string[];
    const requirement = t.requiredScope === "ALL" ? "Everyone" : t.requiredScope === "SELECTED" ? (names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`) || "Selected" : "Not required";
    const holders = c.required > 0 ? `${c.compliant} of ${c.required} required` : (() => { const n = new Set(records.filter((r) => r.typeId === t.id || (!r.typeId && r.name.trim().toLowerCase() === t.name.trim().toLowerCase())).map((r) => r.employeeId)).size; return `${n} ${n === 1 ? "person" : "people"}`; })();
    return { id: t.id, name: t.name, category: t.category, issuingBody: t.issuingBody, validityMonths: t.validityMonths, requiredScope: t.requiredScope, requiredSiteIds: t.requiredSiteIds, requiredCrewIds: t.requiredCrewIds, requirement, holders };
  });
  const categories = [...new Set(types.map((t) => t.category).filter(Boolean))];
  return <CertificationCatalog rows={rows} sites={sites} crews={crews} categories={categories} canEdit={v.isSafetyTeam} />;
}
