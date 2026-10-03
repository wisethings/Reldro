import { redirect } from "next/navigation";
import { loadAccount } from "@/lib/auth/account";
import { requireSession } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  // Specialists and the retired expert-help marketplace no longer exist.
  if (session.role === "SPECIALIST") redirect("/login");
  if (session.role === "PLATFORM_ADMIN") redirect("/platform-admin");

  const account = session.organizationId ? await loadAccount(session.sub) : null;
  if (!account || account.orgName === null) redirect("/login");
  const isAdmin = session.role === "COMPANY_ADMIN";
  if (!account.onboardingDone && isAdmin) redirect("/onboarding");

  const isSafetyLead = Boolean(account.isSafetyLead);
  const isSupervisor = Boolean(account.isDepartmentAdmin);
  const roleLabel = isAdmin ? "Company Admin" : isSafetyLead ? "Safety Lead" : isSupervisor ? "Supervisor" : "Employee";

  return (
    <DashboardShell
      audience={{ isAdmin, isSafetyTeam: isAdmin || isSafetyLead, isSupervisor }}
      orgName={account.orgName}
      name={session.name}
      roleLabel={roleLabel}
    >
      {children}
    </DashboardShell>
  );
}
