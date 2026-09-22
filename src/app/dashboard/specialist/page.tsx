import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";

export default async function SpecialistHomePage() {
  const session = await requireSession();
  if (!session.specialistId) redirect("/dashboard/overview");

  const specialist = await prisma.specialist.findUnique({ where: { id: session.specialistId } });
  const projects = await prisma.project.findMany({
    where: { specialistId: session.specialistId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  const active = projects.filter((p) => p.status === "ACTIVE");
  const proposed = projects.filter((p) => p.status === "PROPOSED");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Welcome back, {session.name.split(" ")[0]}</h1>
        <p className="text-sm text-ink-500">Your activity and active engagements.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Active projects" value={active.length} />
        <StatTile label="New requests" value={proposed.length} />
        <StatTile label="Completed projects" value={specialist?.completedProjects ?? 0} />
        <StatTile label="Rating" value={specialist ? `★ ${specialist.ratingAvg.toFixed(1)}` : "—"} />
      </div>

      {proposed.length > 0 && (
        <Card>
          <CardHeader title="New project requests" />
          <CardBody className="divide-y divide-ink-100 p-0">
            {proposed.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
                <div>
                  <p className="text-sm font-medium text-ink-900">{p.title}</p>
                  <p className="text-xs text-ink-500">{p.organization.name}</p>
                </div>
                <Badge tone="amber">Proposed</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Active projects" />
        <CardBody className="divide-y divide-ink-100 p-0">
          {active.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-ink-50">
              <div>
                <p className="text-sm font-medium text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-500">{p.organization.name}</p>
              </div>
              <Badge tone="blue">{p.stage.replace("_", " ").toLowerCase()}</Badge>
            </Link>
          ))}
          {active.length === 0 && <p className="p-5 text-sm text-ink-500">No active projects right now.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
