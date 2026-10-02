import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/guards";
import { SafetyOnboarding } from "@/components/onboarding/SafetyOnboarding";
import { Logo } from "@/components/ui/Logo";
import { getPack } from "@/lib/safety/pack";
import { repeatLabel } from "@/lib/safety/repeat";

export default async function OnboardingPage() {
  const session = await requireOrganization();
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");
  if (org.onboardingDone) redirect("/dashboard/overview");

  const starters = getPack().inspectionTemplates.map((t) => ({ name: t.name, cadence: repeatLabel(t.frequencyDays), items: t.items.length }));

  return (
    <main className="min-h-[100dvh] bg-ink-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 flex items-center"><Logo height={28} /></div>
        <SafetyOnboarding companyName={org.name} starters={starters} />
      </div>
    </main>
  );
}
