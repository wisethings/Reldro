import "server-only";
import { prisma } from "@/lib/prisma";

export type MatchContext = {
  industry?: string | null;
  department?: string | null;
  tools?: string[];
  complexity?: "LOW" | "MEDIUM" | "HIGH";
};

/**
 * Ranks approved specialists against a workflow/opportunity context. This is
 * the same scoring the marketplace's "smart match" and opportunity detail
 * "recommended specialist" panel both call, so recommendations stay
 * consistent across the product.
 */
export async function matchSpecialists(context: MatchContext, limit = 3) {
  const specialists = await prisma.specialist.findMany({
    where: { approved: true },
    include: { tags: true, user: true },
  });

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

export type SpecialistMatch = Awaited<ReturnType<typeof matchSpecialists>>[number];
