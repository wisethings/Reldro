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
            <div key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{s.user.name}</p>
                <p className="text-xs text-ink-500">{s.headline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
