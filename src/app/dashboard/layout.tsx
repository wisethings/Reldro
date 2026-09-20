import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { AssistantWidget } from "@/components/dashboard/AssistantWidget";

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Company Admin",
  EMPLOYEE: "Employee",
  SPECIALIST: "AI Specialist",
  PLATFORM_ADMIN: "Platform Admin",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  let orgName: string | null = null;
  if (session.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
    if (!org) redirect("/login");
    if (!org.onboardingDone && session.role === "COMPANY_ADMIN") redirect("/onboarding");
    orgName = org.name;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar role={session.role} orgName={orgName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={session.name} roleLabel={ROLE_LABELS[session.role]} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {session.organizationId && <AssistantWidget />}
    </div>
  );
}
