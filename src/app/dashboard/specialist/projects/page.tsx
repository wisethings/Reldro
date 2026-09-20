import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function SpecialistProjectsPage() {
  const session = await requireSession();
  if (!session.specialistId) redirect("/dashboard/overview");

  const projects = await prisma.project.findMany({
    where: { specialistId: session.specialistId },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Projects</h1>
        <p className="text-sm text-ink-500">All engagements across your marketplace clients.</p>
      </div>
      <Card>
        <CardBody className="divide-y divide-ink-100 p-0">
          {projects.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-ink-50">
              <div>
                <p className="text-sm font-medium text-ink-900">{p.title}</p>
                <p className="text-xs text-ink-500">{p.organization.name}</p>
              </div>
              <div className="flex gap-1.5">
                <Badge>{p.stage.replace("_", " ").toLowerCase()}</Badge>
                <Badge tone={p.status === "ACTIVE" ? "green" : p.status === "PROPOSED" ? "amber" : "neutral"}>{p.status.toLowerCase()}</Badge>
              </div>
            </Link>
          ))}
          {projects.length === 0 && <p className="p-6 text-sm text-ink-500">No projects yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
