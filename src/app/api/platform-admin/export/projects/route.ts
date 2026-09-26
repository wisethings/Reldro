import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

export async function GET() {
  await requireRole(["PLATFORM_ADMIN"]);

  const projects = await prisma.project.findMany({
    include: {
      organization: true,
      specialist: { include: { user: true } },
      opportunity: { include: { department: true } },
      workflow: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = projects.map((p) => ({
    id: p.id,
    title: p.title,
    organization: p.organization.name,
    industry: p.organization.industry,
    specialist: p.specialist?.user.name ?? "",
    specialistEmail: p.specialist?.user.email ?? "",
    status: p.status,
    stage: p.stage,
    department: p.opportunity?.department?.name ?? p.workflow?.department ?? "",
    complexity: p.opportunity?.complexity ?? p.workflow?.difficulty ?? "",
    tools: p.opportunity?.toolsRequired ?? p.workflow?.toolsRequired ?? [],
    budget: p.budget ?? "",
    startDate: p.startDate ? p.startDate.toISOString() : "",
    targetEndDate: p.targetEndDate ? p.targetEndDate.toISOString() : "",
    ccEmails: p.ccEmails,
    createdAt: p.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "organization", label: "Organization" },
    { key: "industry", label: "Industry" },
    { key: "specialist", label: "Specialist" },
    { key: "specialistEmail", label: "Specialist email" },
    { key: "status", label: "Status" },
    { key: "stage", label: "Stage" },
    { key: "department", label: "Department" },
    { key: "complexity", label: "Complexity" },
    { key: "tools", label: "Tools required" },
    { key: "budget", label: "Budget" },
    { key: "startDate", label: "Start date" },
    { key: "targetEndDate", label: "Target end date" },
    { key: "ccEmails", label: "CC emails" },
    { key: "createdAt", label: "Created at" },
  ]);

  return new NextResponse(csv, { headers: csvResponseHeaders("reldro-projects.csv") });
}
