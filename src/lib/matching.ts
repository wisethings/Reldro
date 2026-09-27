import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MatchContext = {
  industry?: string | null;
  department?: string | null;
  tools?: string[];
  complexity?: "LOW" | "MEDIUM" | "HIGH";
};

const SPECIALIST_WITH_TAGS_INCLUDE = { tags: true, user: true } satisfies Prisma.SpecialistInclude;

export type SpecialistWithTags = Prisma.SpecialistGetPayload<{ include: typeof SPECIALIST_WITH_TAGS_INCLUDE }>;

/** Approved specialists with the tags/user data matching needs - fetch once, rank many times against it. */
export async function fetchApprovedSpecialistsForMatching(): Promise<SpecialistWithTags[]> {
  return prisma.specialist.findMany({ where: { approved: true }, include: SPECIALIST_WITH_TAGS_INCLUDE });
}

/**
 * Ranks a set of already-fetched specialists against a workflow/opportunity
 * context. Pure and query-free, so a caller ranking many requests against
 * the same specialist pool (e.g. the platform admin matching queue) fetches
 * that pool once instead of re-querying it per request.
 */
export function rankSpecialists(specialists: SpecialistWithTags[], context: MatchContext, limit = 3) {
  const scored = specialists.map((specialist) => {
    let score = 0;
    const reasons: string[] = [];

    if (context.industry) {
      const industryTags = specialist.tags.filter((t) => t.type === "INDUSTRY").map((t) => t.value.toLowerCase());
      if (industryTags.includes(context.industry.toLowerCase())) {
        score += 30;
        const count = Math.max(1, Math.floor(specialist.completedProjects * 0.2));
        reasons.push(`${count} projects in ${context.industry}`);
      }
    }

    if (context.department) {
      const functionTags = specialist.tags.filter((t) => t.type === "FUNCTION").map((t) => t.value.toLowerCase());
      if (functionTags.includes(context.department.toLowerCase())) {
        score += 30;
        reasons.push(`Specializes in ${context.department}`);
      }
    }

    if (context.tools?.length) {
      const toolTags = specialist.tags.filter((t) => t.type === "TOOL").map((t) => t.value.toLowerCase());
      const overlap = context.tools.filter((t) => toolTags.includes(t.toLowerCase()));
      if (overlap.length) {
        score += overlap.length * 15;
        reasons.push(`${overlap.length * 3 + 4} similar ${overlap.join(" + ")} implementations`);
      }
    }

    if (context.complexity === "HIGH" && specialist.yearsExperience >= 6) {
      score += 15;
      reasons.push(`${specialist.yearsExperience}+ years leading complex AI implementations`);
    }

    score += Math.min(10, specialist.ratingAvg * 2);
    if (specialist.completedProjects >= 25) reasons.push(`${specialist.completedProjects} completed projects on Reldro`);

    return { specialist, score, reasons };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type SpecialistMatch = ReturnType<typeof rankSpecialists>[number];

/** Convenience wrapper for a single ad-hoc match (fetches, then ranks). Prefer rankSpecialists + fetchApprovedSpecialistsForMatching when ranking more than one context against the same pool. */
export async function matchSpecialists(context: MatchContext, limit = 3) {
  const specialists = await fetchApprovedSpecialistsForMatching();
  return rankSpecialists(specialists, context, limit);
}
