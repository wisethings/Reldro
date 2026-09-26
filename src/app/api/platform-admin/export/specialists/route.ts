import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

export async function GET() {
  await requireRole(["PLATFORM_ADMIN"]);

  const specialists = await prisma.specialist.findMany({
    include: { user: true, tags: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = specialists.map((s) => ({
    id: s.id,
    name: s.user.name,
    email: s.user.email,
    headline: s.headline,
    yearsExperience: s.yearsExperience,
    hourlyRate: s.hourlyRate ?? "",
    projectRateMin: s.projectRateMin ?? "",
    projectRateMax: s.projectRateMax ?? "",
    availability: s.availability,
    location: s.location ?? "",
    approved: s.approved ? "yes" : "no",
    featured: s.featured ? "yes" : "no",
    ratingAvg: s.ratingAvg,
    ratingCount: s.ratingCount,
    completedProjects: s.completedProjects,
    industries: s.tags.filter((t) => t.type === "INDUSTRY").map((t) => t.value),
    functions: s.tags.filter((t) => t.type === "FUNCTION").map((t) => t.value),
    tools: s.tags.filter((t) => t.type === "TOOL").map((t) => t.value),
    createdAt: s.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "headline", label: "Headline" },
    { key: "yearsExperience", label: "Years experience" },
    { key: "hourlyRate", label: "Hourly rate" },
    { key: "projectRateMin", label: "Project rate min" },
    { key: "projectRateMax", label: "Project rate max" },
    { key: "availability", label: "Availability" },
    { key: "location", label: "Location" },
    { key: "approved", label: "Approved" },
    { key: "featured", label: "Featured" },
    { key: "ratingAvg", label: "Rating avg" },
    { key: "ratingCount", label: "Rating count" },
    { key: "completedProjects", label: "Completed projects" },
    { key: "industries", label: "Industries" },
    { key: "functions", label: "Functions" },
    { key: "tools", label: "Tools" },
    { key: "createdAt", label: "Applied at" },
  ]);

  return new NextResponse(csv, { headers: csvResponseHeaders("reldro-specialists.csv") });
}
