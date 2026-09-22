import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SpecialistProfileForm } from "@/components/specialists/SpecialistProfileForm";

export default async function SpecialistProfilePage() {
  const session = await requireSession();
  if (!session.specialistId) redirect("/dashboard/overview");

  const specialist = await prisma.specialist.findUnique({
    where: { id: session.specialistId },
    include: { tags: true, services: true },
  });
  if (!specialist) redirect("/dashboard/overview");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">My profile</h1>
        <p className="text-sm text-ink-500">Reldro's team uses this to match you with expert-help requests.</p>
      </div>
      <Card>
        <CardHeader title="Profile details" />
        <CardBody>
          <SpecialistProfileForm specialist={specialist} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Expertise tags" subtitle="Contact Reldro support to update tags for now" />
        <CardBody className="flex flex-wrap gap-1.5">
          {specialist.tags.map((t) => (
            <span key={t.id} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-700">
              {t.value}
            </span>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
