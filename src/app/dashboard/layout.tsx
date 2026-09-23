import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Company Admin",
  EMPLOYEE: "Employee",
  SPECIALIST: "AI Specialist",
  PLATFORM_ADMIN: "Platform Admin",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  let orgName: string | null = null;
  let isDepartmentAdmin = false;
  if (session.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) redirect("/login");
    if (!org.onboardingDone && session.role === "COMPANY_ADMIN") redirect("/onboarding");
    orgName = org.name;
  }
  if (session.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { isDepartmentAdmin: true } });
    isDepartmentAdmin = employee?.isDepartmentAdmin ?? false;
  }

  return (
    <DashboardShell
      role={session.role}
      orgName={orgName}
      isDepartmentAdmin={isDepartmentAdmin}
      name={session.name}
      roleLabel={ROLE_LABELS[session.role]}
      showAssistant={Boolean(session.organizationId)}
    >
      {children}
    </DashboardShell>
  );
}
