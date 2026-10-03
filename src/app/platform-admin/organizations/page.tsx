import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrganizationsHeader } from "@/components/platform-admin/CreateOrgToggle";
import { ListToolbar } from "@/components/safety/ListToolbar";
import { PAGE_SIZE, Pagination, readPage } from "@/components/safety/Pagination";
import { ago, seatsText } from "@/lib/platformFormat";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS = [
  { value: "active", label: "Active" },
  { value: "setup", label: "Setting up" },
  { value: "suspended", label: "Suspended" },
];

export default async function PlatformOrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const p = await searchParams;
  const q = (p.q ?? "").trim().slice(0, 80);
  const status = STATUS.some((s) => s.value === p.status) ? p.status! : "";

  const where: Prisma.OrganizationWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { users: { some: { role: "COMPANY_ADMIN", email: { contains: q, mode: "insensitive" } } } }] } : {}),
    ...(status === "suspended" ? { suspendedAt: { not: null } } : {}),
    ...(status === "setup" ? { suspendedAt: null, onboardingDone: false } : {}),
    ...(status === "active" ? { suspendedAt: null, onboardingDone: true } : {}),
  };
  const [total, all] = await Promise.all([prisma.organization.count({ where }), prisma.organization.count()]);
  const page = Math.min(readPage(p.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const orgs = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, name: true, industry: true, onboardingDone: true, suspendedAt: true, seatLimit: true, isDemo: true,
      _count: { select: { sites: { where: { active: true } }, users: { where: { role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } } } },
    },
  });
  const last = await prisma.user.groupBy({ by: ["organizationId"], where: { organizationId: { in: orgs.map((o) => o.id) } }, _max: { lastLoginAt: true } });
  const lastBy = new Map(last.map((l) => [l.organizationId, l._max.lastLoginAt]));

  const hrefFor = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (n > 1) sp.set("page", String(n));
    const s = sp.toString();
    return `/platform-admin/organizations${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <OrganizationsHeader count={all} />
      <ListToolbar searchParam="q" placeholder="Search by company or admin email" pageParam="page" selects={[{ param: "status", label: "Status", options: [{ value: "", label: "Any status" }, ...STATUS] }]} />
      <Card tone="plain">
        {orgs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">{q || status ? "No organizations match." : "No organizations yet."}</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link href={`/platform-admin/organizations/${org.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink-900">
                      <span className="min-w-0 break-words">{org.name}</span>
                      {org.isDemo && <Badge tone="gold">Sample</Badge>}
                      {org.suspendedAt ? <Badge tone="red">Suspended</Badge> : !org.onboardingDone ? <Badge tone="amber">Setting up</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {org.industry || "Trade not set"} · {seatsText(org._count.users, org.seatLimit)} · {org._count.sites} site{org._count.sites === 1 ? "" : "s"} · Last sign-in: {ago(lastBy.get(org.id) ?? null)}
                    </p>
                  </div>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Pagination page={page} total={total} hrefFor={hrefFor} noun="organizations" />
    </div>
  );
}
