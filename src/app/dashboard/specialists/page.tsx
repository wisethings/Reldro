import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SpecialistCard } from "@/components/specialists/SpecialistCard";
import { matchSpecialists } from "@/lib/matching";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string; function?: string; tool?: string; minRating?: string }>;
}) {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");
  const params = await searchParams;

  const [specialists, org, topOpportunity, allTags] = await Promise.all([
    prisma.specialist.findMany({
      where: {
        approved: true,
        tags: {
          some: params.industry ? { type: "INDUSTRY", value: params.industry } : undefined,
        },
      },
      include: { tags: true, user: true },
      orderBy: { ratingAvg: "desc" },
    }),
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.opportunity.findFirst({
      where: { organizationId: session.organizationId, recommendedSpecialist: true },
      orderBy: { estAnnualValue: "desc" },
      include: { department: true },
    }),
    prisma.specialistTag.findMany({ distinct: ["type", "value"] }),
  ]);

  const filtered = specialists.filter((s) => {
    if (params.function && !s.tags.some((t) => t.type === "FUNCTION" && t.value === params.function)) return false;
    if (params.tool && !s.tags.some((t) => t.type === "TOOL" && t.value === params.tool)) return false;
    if (params.minRating && s.ratingAvg < Number(params.minRating)) return false;
    return true;
  });

  const industries = Array.from(new Set(allTags.filter((t) => t.type === "INDUSTRY").map((t) => t.value)));
  const functions = Array.from(new Set(allTags.filter((t) => t.type === "FUNCTION").map((t) => t.value)));
  const tools = Array.from(new Set(allTags.filter((t) => t.type === "TOOL").map((t) => t.value)));

  const smartMatches = topOpportunity
    ? await matchSpecialists({
        industry: org?.industry,
        department: topOpportunity.department?.name,
        tools: topOpportunity.toolsRequired,
        complexity: topOpportunity.complexity,
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Find an AI specialist</h1>
        <p className="text-sm text-ink-500">Vetted experts matched to your workflow, industry, and tech stack.</p>
      </div>

      {smartMatches.length > 0 && topOpportunity && (
        <Card>
          <CardHeader
            title={`Recommended for: ${topOpportunity.title}`}
            subtitle="Smart match based on your highest-priority opportunity needing outside help"
          />
          <CardBody className="grid gap-3 sm:grid-cols-3">
            {smartMatches.map(({ specialist, reasons }) => (
              <Link key={specialist.id} href={`/dashboard/specialists/${specialist.id}`} className="rounded-lg border border-ink-200 p-3 hover:border-brand-300">
                <p className="text-sm font-medium text-ink-900">{specialist.user.name}</p>
                <p className="text-xs text-ink-500">{specialist.headline}</p>
                <ul className="mt-2 space-y-0.5 text-[11px] text-ink-500">
                  {reasons.slice(0, 2).map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      <form className="flex flex-wrap gap-3">
        <select name="industry" defaultValue={params.industry ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select name="function" defaultValue={params.function ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All functions</option>
          {functions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select name="tool" defaultValue={params.tool ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">All tools</option>
          {tools.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="minRating" defaultValue={params.minRating ?? ""} className="rounded-lg border border-ink-300 px-3 py-2 text-sm">
          <option value="">Any rating</option>
          <option value="4.5">4.5+ stars</option>
          <option value="4.8">4.8+ stars</option>
        </select>
        <button className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800">Filter</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <SpecialistCard key={s.id} specialist={s} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-500">No specialists match these filters.</p>}
      </div>
    </div>
  );
}
