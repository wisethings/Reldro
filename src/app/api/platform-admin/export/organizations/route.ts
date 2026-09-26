import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

export async function GET() {
  await requireRole(["PLATFORM_ADMIN"]);

  const organizations = await prisma.organization.findMany({
    include: { employees: true, subscription: true },
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
    employeeCount: org.employees.length,
    onboardingDone: org.onboardingDone ? "yes" : "no",
    subscriptionTier: org.subscription?.tier ?? "",
    subscriptionStatus: org.subscription?.status ?? "",
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
    { key: "employeeCount", label: "Employee count" },
    { key: "onboardingDone", label: "Onboarded" },
    { key: "subscriptionTier", label: "Subscription tier" },
    { key: "subscriptionStatus", label: "Subscription status" },
    { key: "createdAt", label: "Created at" },
  ]);

  return new NextResponse(csv, { headers: csvResponseHeaders("reldro-organizations.csv") });
}
