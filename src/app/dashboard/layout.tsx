import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  // Specialists and the retired expert-help marketplace no longer exist.
  if (session.role === "SPECIALIST") redirect("/login");
  if (session.role === "PLATFORM_ADMIN") redirect("/platform-admin");

  const [org, employee] = await Promise.all([
    session.organizationId ? prisma.organization.findUnique({ where: { id: session.organizationId } }) : Promise.resolve(null),
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, select: { isDepartmentAdmin: true, isSafetyLead: true } })
      : Promise.resolve(null),
  ]);

  if (!org) redirect("/login");
  const isAdmin = session.role === "COMPANY_ADMIN";
  if (!org.onboardingDone && isAdmin) redirect("/onboarding");

  const isSafetyLead = Boolean(employee?.isSafetyLead);
  const isSupervisor = Boolean(employee?.isDepartmentAdmin);
  const roleLabel = isAdmin ? "Company Admin" : isSafetyLead ? "Safety Lead" : isSupervisor ? "Supervisor" : "Employee";

  return (
    <DashboardShell
      audience={{ isAdmin, isSafetyTeam: isAdmin || isSafetyLead, isSupervisor }}
      orgName={org.name}
      name={session.name}
      roleLabel={roleLabel}
      isDemo={org.isDemo}
      showSupport={isAdmin}
    >
      {children}
    </DashboardShell>
  );
}
