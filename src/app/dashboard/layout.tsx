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

  // These three lookups are independent of each other - run them concurrently
  // instead of paying for three sequential round trips to the database on
  // every single dashboard page load.
  const [org, employee, hasSeenTour] = await Promise.all([
    session.organizationId ? prisma.organization.findUnique({ where: { id: session.organizationId } }) : Promise.resolve(null),
    session.employeeId
      ? prisma.employee.findUnique({ where: { id: session.employeeId }, select: { isDepartmentAdmin: true } })
      : Promise.resolve(null),
    // Best-effort: the onboarding tour is a nice-to-have, never worth taking
    // the entire dashboard down over if this lookup fails for any reason.
    prisma.user
      .findUnique({ where: { id: session.sub }, select: { hasSeenTour: true } })
      .then((u) => u?.hasSeenTour ?? true)
      .catch(() => true),
  ]);

  if (session.organizationId) {
    if (!org) redirect("/login");
    if (!org.onboardingDone && session.role === "COMPANY_ADMIN") redirect("/onboarding");
  }
  const orgName = org?.name ?? null;
  const isDepartmentAdmin = employee?.isDepartmentAdmin ?? false;
  const showTour = !hasSeenTour && (session.role === "COMPANY_ADMIN" || session.role === "EMPLOYEE");

  return (
    <DashboardShell
      role={session.role}
      orgName={orgName}
      isDepartmentAdmin={isDepartmentAdmin}
      name={session.name}
      roleLabel={ROLE_LABELS[session.role]}
      showAssistant={Boolean(session.organizationId)}
      showTour={showTour}
    >
      {children}
    </DashboardShell>
  );
}
