import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requestSpecialist } from "@/lib/actions/marketplace";

export default async function SpecialistProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ opportunity?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const { id } = await params;
  const { opportunity } = await searchParams;

  const specialist = await prisma.specialist.findUnique({
    where: { id },
    include: { user: true, tags: true, services: true, reviews: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!specialist) notFound();

  const industries = specialist.tags.filter((t) => t.type === "INDUSTRY").map((t) => t.value);
  const functions = specialist.tags.filter((t) => t.type === "FUNCTION").map((t) => t.value);
  const tools = specialist.tags.filter((t) => t.type === "TOOL").map((t) => t.value);
  const certifications = specialist.tags.filter((t) => t.type === "CERTIFICATION").map((t) => t.value);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link href="/dashboard/specialists" className="text-xs font-medium text-ink-500 hover:text-ink-800">
        ← Marketplace
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800">
            {specialist.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{specialist.user.name}</h1>
            <p className="text-sm text-ink-500">{specialist.headline}</p>
            <p className="text-xs text-ink-400">{specialist.location}</p>
          </div>
        </div>
        {session.role === "COMPANY_ADMIN" && (
          <form action={requestSpecialist.bind(null, specialist.id, opportunity, undefined)}>
            <button className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800">
              Request specialist
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Rating" value={`★ ${specialist.ratingAvg.toFixed(1)} (${specialist.ratingCount})`} />
        <Stat label="Projects completed" value={String(specialist.completedProjects)} />
        <Stat label="Experience" value={`${specialist.yearsExperience} yrs`} />
        <Stat label="Rate" value={specialist.hourlyRate ? `$${specialist.hourlyRate}/hr` : "Project-based"} />
      </div>

      <Card>
        <CardHeader title="About" />
        <CardBody>
          <p className="text-sm text-ink-700 whitespace-pre-line">{specialist.bio}</p>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Expertise" />
          <CardBody className="space-y-3">
            <TagRow label="Industries" values={industries} />
            <TagRow label="Functions" values={functions} />
            <TagRow label="Tools" values={tools} />
            {certifications.length > 0 && <TagRow label="Certifications" values={certifications} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Availability" />
          <CardBody>
            <Badge tone={specialist.availability === "Available now" ? "green" : "neutral"}>{specialist.availability}</Badge>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Services" />
        <CardBody className="divide-y divide-ink-100 p-0">
          {specialist.services.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{s.name}</p>
                <p className="text-xs text-ink-500">{s.description}</p>
              </div>
              <p className="text-sm font-semibold text-ink-900">
                ${s.price}
                {s.priceType === "HOURLY" ? "/hr" : " project"}
              </p>
            </div>
          ))}
          {specialist.services.length === 0 && <p className="p-5 text-sm text-ink-500">No published services yet.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Client reviews" />
        <CardBody className="divide-y divide-ink-100 p-0">
          {specialist.reviews.map((r) => (
            <div key={r.id} className="px-5 py-3">
              <p className="text-sm font-medium text-ink-900">★ {r.rating}/5</p>
              <p className="mt-1 text-sm text-ink-600">{r.comment}</p>
            </div>
          ))}
          {specialist.reviews.length === 0 && <p className="p-5 text-sm text-ink-500">No reviews yet.</p>}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function TagRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v}>{v}</Badge>
        ))}
      </div>
    </div>
  );
}
