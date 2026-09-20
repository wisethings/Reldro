import "server-only";
import { prisma } from "@/lib/prisma";

export async function getOrgTrend(organizationId: string, months = 6) {
  const snapshots = await prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, department: null },
    orderBy: { month: "asc" },
  });
  return snapshots.slice(-months).map((s) => ({
    month: s.month.toLocaleString("en-US", { month: "short" }),
    score: s.aiAdoptionScore,
    raw: s,
  }));
}

export async function getLatestOrgSnapshot(organizationId: string) {
  return prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: null },
    orderBy: { month: "desc" },
  });
}

export async function getDepartmentSnapshots(organizationId: string) {
  const latestMonth = await prisma.adoptionMetricSnapshot.findFirst({
    where: { organizationId, department: { not: null } },
    orderBy: { month: "desc" },
    select: { month: true },
  });
  if (!latestMonth) return [];
  return prisma.adoptionMetricSnapshot.findMany({
    where: { organizationId, month: latestMonth.month, department: { not: null } },
    orderBy: { adoptionPct: "desc" },
  });
}
