import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/guards";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Logo } from "@/components/ui/Logo";

export default async function OnboardingPage() {
  const session = await requireOrganization();
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");
  if (org.onboardingDone) redirect("/dashboard/overview");

  return (
    <div className="min-h-screen bg-ink-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2">
          <Logo height={36} />
        </div>
        <OnboardingWizard companyName={org.name} />
      </div>
    </div>
  );
}
