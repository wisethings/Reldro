import "server-only";
import { prisma } from "@/lib/prisma";
import { SUPPORT_EMAIL } from "@/lib/support";

/** A seat is one person with a sign-in: a company admin or an employee. Reldro staff accounts never count. */
export async function seatUsage(organizationId: string) {
  const [used, org] = await Promise.all([
    prisma.user.count({ where: { organizationId, role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { seatLimit: true } }),
  ]);
  return { used, limit: org?.seatLimit ?? null };
}

/** Returns a message to show when the workspace has no seat left for one more person, otherwise null. */
export async function seatBlockMessage(organizationId: string): Promise<string | null> {
  const { used, limit } = await seatUsage(organizationId);
  if (limit === null || used < limit) return null;
  return `All ${limit} seats in this workspace are in use. Email ${SUPPORT_EMAIL} to add more.`;
}
