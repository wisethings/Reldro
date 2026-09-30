import "server-only";
import { prisma } from "@/lib/prisma";
import { severityRank } from "./pack";

export type Routing = {
  ownerId: string | null;
  respondBy: Date | null;
  ruleId: string | null;
};

/**
 * Chooses the owner and response deadline for a new report from the
 * organization's escalation rules. Most specific matching rule wins
 * (category + site > site > category > any); ties go to the higher
 * severity threshold. With no matching rule the site's safety lead owns it,
 * and with no site lead it stays unassigned, which the Overview surfaces as
 * an exception. This is a visible, editable rule set, not a hidden model.
 */
export async function routeReport(params: {
  organizationId: string;
  siteId: string | null;
  category: string;
  severity: string;
  createdAt: Date;
}): Promise<Routing> {
  const { organizationId, siteId, category, severity, createdAt } = params;
  const [rules, site] = await Promise.all([
    prisma.escalationRule.findMany({ where: { organizationId } }),
    siteId ? prisma.site.findUnique({ where: { id: siteId }, select: { safetyLeadId: true } }) : Promise.resolve(null),
  ]);

  const rank = severityRank(severity);
  const matching = rules
    .filter((r) => severityRank(r.minSeverity) <= rank)
    .filter((r) => !r.category || r.category === category)
    .filter((r) => !r.siteId || r.siteId === siteId)
    .map((r) => ({ r, specificity: (r.category ? 2 : 0) + (r.siteId ? 1 : 0), threshold: severityRank(r.minSeverity) }))
    .sort((a, b) => b.specificity - a.specificity || b.threshold - a.threshold);

  const best = matching[0]?.r;
  const ownerId = best?.ownerId ?? site?.safetyLeadId ?? null;
  const respondBy = best ? new Date(createdAt.getTime() + best.respondWithinHours * 3600_000) : null;
  return { ownerId, respondBy, ruleId: best?.id ?? null };
}

/** Who to alert when a report has gone unacknowledged past its deadline (the matching rule's escalateTo). */
export async function escalationTargetFor(params: { organizationId: string; siteId: string | null; category: string; severity: string }) {
  const rules = await prisma.escalationRule.findMany({ where: { organizationId: params.organizationId, escalateToId: { not: null } } });
  const rank = severityRank(params.severity);
  const best = rules
    .filter((r) => severityRank(r.minSeverity) <= rank && (!r.category || r.category === params.category) && (!r.siteId || r.siteId === params.siteId))
    .sort((a, b) => (b.category ? 2 : 0) + (b.siteId ? 1 : 0) - ((a.category ? 2 : 0) + (a.siteId ? 1 : 0)))[0];
  return best?.escalateToId ?? null;
}
