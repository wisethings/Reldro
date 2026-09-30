import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/safety/context";
import { getPack } from "@/lib/safety/pack";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, fmtDate, PageHeader } from "@/components/safety/ui";
import { AcknowledgeButton, DeleteQualificationButton, DeleteTalkButton, PersonRoleControls, QualificationForm, TalkForm } from "@/components/safety/TrainingForms";
import { InviteEmployeeForm } from "@/components/team/InviteEmployeeForm";
import { ResendInviteButton } from "@/components/team/ResendInviteButton";

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const v = await requireViewer();
  const { tab = "talks" } = await searchParams;
  const pack = getPack();
  const canManage = v.isSafetyTeam || v.isSupervisor;
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86400_000);

  const tabs = [["talks", v.isSafetyTeam || v.isSupervisor ? "Toolbox talks" : "Toolbox talks"], ...(canManage ? [["qualifications", "Qualifications"]] : [["mine", "My qualifications"]]), ...(v.isAdmin ? [["people", "People"]] : [])];
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-xs font-medium ${active ? "border-brand-700 bg-orchid-soft text-orchid-deep" : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"}`;
  const activeTab = tabs.some(([k]) => k === tab) ? tab : "talks";

  const sites = await prisma.site.findMany({ where: { organizationId: v.organizationId, active: true }, orderBy: { name: "asc" } });

  let body: React.ReactNode = null;

  if (activeTab === "talks") {
    const talks = await prisma.toolboxTalk.findMany({
      where: { organizationId: v.organizationId, ...(v.isSafetyTeam ? {} : { OR: [{ siteId: null }, { siteId: v.siteId ?? "__none__" }] }) },
      include: { acknowledgements: true },
      orderBy: { scheduledFor: "desc" },
      take: 30,
    });
    const employees = await prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: { select: { name: true } } } });
    const lessons = await prisma.investigation.findMany({ where: { organizationId: v.organizationId, shareLesson: true }, include: { report: { select: { category: true } } }, orderBy: { completedAt: "desc" }, take: 6 });
    const mine = new Set(talks.flatMap((t) => t.acknowledgements.filter((a) => a.employeeId === v.employeeId).map(() => t.id)));
    body = (
      <div className="space-y-5">
        {canManage && (
          <Card>
            <CardHeader title="New toolbox talk" subtitle="A short talk for the crew, with a record of who attended." />
            <CardBody><TalkForm sites={sites.map((s) => ({ id: s.id, name: s.name }))} lockSiteId={v.isSafetyTeam ? null : v.siteId} /></CardBody>
          </Card>
        )}
        {lessons.length > 0 && (
          <Card>
            <CardHeader title="Lessons from recent incidents" subtitle="Shared by the safety team, with names and personal details removed." />
            <ul className="divide-y divide-ink-200">
              {lessons.map((l) => <li key={l.id} className="px-4 py-3 text-sm text-ink-800 sm:px-5"><span className="mr-2 rounded bg-surface-sunken px-1.5 py-0.5 text-[11px] text-ink-600">{pack.categories.find((c) => c.key === l.report.category)?.label ?? "Other"}</span>{l.lessonText}</li>)}
            </ul>
          </Card>
        )}
        {talks.length === 0 ? (
          <EmptyState title="No toolbox talks yet" body={canManage ? "Publish your first one above." : "When your supervisor publishes a talk, it will show up here."} />
        ) : (
          talks.map((t) => {
            const audience = employees.filter((e) => !t.siteId || e.siteId === t.siteId);
            const ackIds = new Set(t.acknowledgements.map((a) => a.employeeId));
            const missing = audience.filter((e) => !ackIds.has(e.id));
            return (
              <Card key={t.id}>
                <CardHeader
                  title={t.title}
                  subtitle={`${fmtDate(t.scheduledFor)} · ${t.siteId ? sites.find((s) => s.id === t.siteId)?.name ?? "One site" : "Whole company"} · by ${t.createdByName}`}
                  action={<div className="flex items-center gap-2">{t.aiDrafted && <Badge tone="brand">AI-assisted, reviewed</Badge>}{canManage && <DeleteTalkButton talkId={t.id} />}</div>}
                />
                <CardBody className="space-y-3">
                  <p className="whitespace-pre-wrap text-sm text-ink-800">{t.content}</p>
                  {v.employeeId && (mine.has(t.id) ? <Badge tone="green">You acknowledged this</Badge> : <AcknowledgeButton talkId={t.id} />)}
                  {canManage && (
                    <details className="rounded-lg border border-ink-200 p-3 text-sm">
                      <summary className="cursor-pointer font-medium text-ink-800">{ackIds.size} of {audience.length} acknowledged</summary>
                      {missing.length > 0 ? <p className="mt-2 text-xs text-ink-600">Not yet: {missing.map((m) => m.user.name).join(", ")}</p> : <p className="mt-2 text-xs text-sage-deep">Everyone in scope has acknowledged.</p>}
                    </details>
                  )}
                </CardBody>
              </Card>
            );
          })
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
          <Card>
            <CardHeader title="Record a qualification" subtitle="Certifications and authorizations with an expiry date. Reldro flags them 30 days before they lapse." />
            <CardBody><QualificationForm people={people.map((p) => ({ id: p.id, name: p.user.name }))} suggestions={pack.qualificationSuggestions} /></CardBody>
          </Card>
        )}
        {quals.length === 0 ? (
          <EmptyState title="No qualifications recorded" body={canManage ? "Add the certifications your crews need (aerial lift, first aid, OSHA 30) so expiry dates don't sneak up." : "Your supervisor records certifications for you."} />
        ) : (
          <Card>
            <ul className="divide-y divide-ink-200">
              {quals.map((q) => {
                const expired = q.expiresOn && q.expiresOn < now;
                const soon = q.expiresOn && !expired && q.expiresOn <= in30;
                return (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                    <div><p className="text-sm font-medium text-ink-900">{canManage ? `${names.get(q.employeeId) ?? "Someone"} · ` : ""}{q.name}</p><p className="text-xs text-ink-500">{q.issuedOn ? `Issued ${fmtDate(q.issuedOn)} · ` : ""}{q.expiresOn ? `Expires ${fmtDate(q.expiresOn)}` : "No expiry"}</p></div>
                    <div className="flex items-center gap-3">{expired ? <Badge tone="red">Expired</Badge> : soon ? <Badge tone="amber">Expires soon</Badge> : <Badge tone="green">Current</Badge>}{canManage && <DeleteQualificationButton id={q.id} />}</div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    );
  } else if (activeTab === "people" && v.isAdmin) {
    const [people, crews, users] = await Promise.all([
      prisma.employee.findMany({ where: { organizationId: v.organizationId }, include: { user: true, department: true }, orderBy: { user: { name: "asc" } } }),
      prisma.department.findMany({ where: { organizationId: v.organizationId }, orderBy: { name: "asc" } }),
      Promise.resolve(null),
    ]);
    void users;
    body = (
      <div className="space-y-5">
        <Card>
          <CardHeader title="Add a person" subtitle="They get a temporary password by email (or you can share it directly if email isn't set up)." />
          <CardBody><InviteEmployeeForm crews={crews.map((c) => ({ id: c.id, name: c.name }))} sites={sites.map((s) => ({ id: s.id, name: s.name }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader title={`People (${people.length})`} subtitle="Supervisors see their own site. Safety leads see every report and investigation. Only company admins change these." />
          <ul className="divide-y divide-ink-200">
            {people.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3"><Avatar name={p.user.name} size={28} /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink-900">{p.user.name}</p><p className="truncate text-xs text-ink-500">{p.jobTitle}{p.department ? ` · ${p.department.name}` : ""} · {p.user.email}</p></div></div>
                  {p.user.lastLoginAt === null && <div className="flex items-center gap-2"><Badge tone="amber">Invite pending</Badge><ResendInviteButton userId={p.userId} name={p.user.name} /></div>}
                </div>
                <PersonRoleControls employeeId={p.id} siteId={p.siteId} isSafetyLead={p.isSafetyLead} isSupervisor={p.isDepartmentAdmin} sites={sites.map((s) => ({ id: s.id, name: s.name }))} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <PageHeader title={v.isAdmin || v.isSafetyTeam ? "People & Training" : v.isSupervisor ? "Training" : "Toolbox talks"} subtitle="Toolbox talks, acknowledgements and qualifications. Assignments here keep the safety loop connected to who is on site." />
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map(([k, label]) => <Link key={k} href={`?tab=${k}`} className={chip(activeTab === k)}>{label}</Link>)}
        </div>
      )}
      {body}
    </div>
  );
}
