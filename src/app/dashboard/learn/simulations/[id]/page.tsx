import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SimulationRunner } from "@/components/learning/SimulationRunner";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;

  const simulation = await prisma.simulation.findUnique({ where: { id } });
  if (!simulation) notFound();

  const pastAttempts = session.employeeId
    ? await prisma.simulationAttempt.findMany({
        where: { employeeId: session.employeeId, simulationId: id },
        orderBy: { completedAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Link href="/dashboard/learn" className="text-xs font-medium text-ink-500 hover:text-ink-800">
        ← Back to Learn
      </Link>
      <div>
        <p className="text-xs font-medium text-orchid-deep">{simulation.department} simulation</p>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">{simulation.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{simulation.description}</p>
      </div>

      <Card>
        <CardHeader title="Scenario" />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{simulation.scenario}</p>
        </CardBody>
      </Card>

      {session.employeeId ? (
        <Card>
          <CardHeader title="Your response" />
          <CardBody>
            <SimulationRunner simulationId={simulation.id} />
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-ink-500">Sign in as an employee to attempt this simulation.</p>
      )}

      {pastAttempts.length > 0 && (
        <Card>
          <CardHeader title="Past attempts" />
          <CardBody className="divide-y divide-ink-200 p-0">
            {pastAttempts.map((a) => (
              <div key={a.id} className="px-5 py-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink-900">{a.score}/100</span>
                  <span className="text-ink-400">{a.completedAt.toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-ink-600">{a.feedback}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
