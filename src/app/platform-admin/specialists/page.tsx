import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { approveSpecialist, rejectSpecialist, toggleFeaturedSpecialist } from "@/lib/actions/platform-admin";

export default async function PlatformSpecialistsPage() {
  const specialists = await prisma.specialist.findMany({
    include: { user: true, tags: true },
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Specialists</h1>
          <p className="text-sm text-ink-500">Approve specialist applications so they're eligible for expert-help matches.</p>
        </div>
        <Link
          href="/api/platform-admin/export/specialists"
          className="rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
        >
          Export CSV
        </Link>
      </div>
      <Card>
        <CardBody className="divide-y divide-ink-200 p-0">
          {specialists.map((s) => (
            <div key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{s.user.name}</p>
                <p className="text-xs text-ink-500">{s.headline}</p>
                <p className="mt-1 text-xs text-ink-500">{s.user.email}</p>
                <p className="mt-2 max-w-2xl whitespace-pre-line text-xs text-ink-600">{s.bio}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t.id} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-700">
                      {t.value}
                    </span>
                  ))}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-ink-500 sm:grid-cols-3">
                  {s.yearsExperience != null && (
                    <div>
                      <dt className="inline text-ink-400">Experience: </dt>
                      <dd className="inline">{s.yearsExperience} yrs</dd>
                    </div>
                  )}
                  {s.hourlyRate != null && (
                    <div>
                      <dt className="inline text-ink-400">Hourly: </dt>
                      <dd className="inline">${s.hourlyRate}</dd>
                    </div>
                  )}
                  {(s.projectRateMin != null || s.projectRateMax != null) && (
                    <div>
                      <dt className="inline text-ink-400">Project: </dt>
                      <dd className="inline">
                        ${s.projectRateMin ?? "?"}-${s.projectRateMax ?? "?"}
                      </dd>
                    </div>
                  )}
                  {s.location && (
                    <div>
                      <dt className="inline text-ink-400">Location: </dt>
                      <dd className="inline">{s.location}</dd>
                    </div>
                  )}
                  {s.preferredEngagementTypes.length > 0 && (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="inline text-ink-400">Engagement: </dt>
                      <dd className="inline">{s.preferredEngagementTypes.join(", ")}</dd>
                    </div>
                  )}
                </dl>
                {(s.linkedinUrl || s.portfolioUrl) && (
                  <p className="mt-2 flex flex-wrap gap-3 text-[11px]">
                    {s.linkedinUrl && (
                      <a href={s.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-orchid-deep hover:underline">
                        LinkedIn ↗
                      </a>
                    )}
                    {s.portfolioUrl && (
                      <a href={s.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-orchid-deep hover:underline">
                        Portfolio ↗
                      </a>
                    )}
                  </p>
                )}
                {s.notableProjects && (
                  <p className="mt-2 max-w-2xl whitespace-pre-line rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    {s.notableProjects}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge tone={s.approved ? "green" : "amber"}>{s.approved ? "Approved" : "Pending"}</Badge>
                {s.featured && <Badge tone="brand">Featured</Badge>}
                {s.approved ? (
                  <form action={rejectSpecialist.bind(null, s.id)}>
                    <button className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">
                      Revoke
                    </button>
                  </form>
                ) : (
                  <form action={approveSpecialist.bind(null, s.id)}>
                    <button className="rounded-full bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800">
                      Approve
                    </button>
                  </form>
                )}
                <form action={toggleFeaturedSpecialist.bind(null, s.id, !s.featured)}>
                  <button className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">
                    {s.featured ? "Unfeature" : "Feature"}
                  </button>
                </form>
              </div>
            </div>
          ))}
          {specialists.length === 0 && <p className="p-6 text-sm text-ink-500">No specialist applications yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
