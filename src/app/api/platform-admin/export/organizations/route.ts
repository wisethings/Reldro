import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

export async function GET() {
  await requireRole(["PLATFORM_ADMIN"]);

  const organizations = await prisma.organization.findMany({
    include: { _count: { select: { users: { where: { role: { in: ["COMPANY_ADMIN", "EMPLOYEE"] } } } } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    industry: org.industry,
    size: org.size,
    revenueRange: org.revenueRange,
    geography: org.geography,
    businessModel: org.businessModel,
    peopleCount: org._count.users,
    seatLimit: org.seatLimit ?? "",
    onboardingDone: org.onboardingDone ? "yes" : "no",
    status: org.suspendedAt ? "suspended" : "active",
    createdAt: org.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "industry", label: "Industry" },
    { key: "size", label: "Size" },
    { key: "revenueRange", label: "Revenue range" },
    { key: "geography", label: "Geography" },
    { key: "businessModel", label: "Business model" },
    { key: "peopleCount", label: "People with accounts" },
    { key: "seatLimit", label: "Seats" },
    { key: "onboardingDone", label: "Onboarded" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Created at" },
  ]);

  return new NextResponse(csv, { headers: csvResponseHeaders("reldro-organizations.csv") });
}
