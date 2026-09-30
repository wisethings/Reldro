import { Lock, UserRound } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();
  const employee = session.employeeId
    ? await prisma.employee.findUnique({ where: { id: session.employeeId }, include: { department: true } })
    : null;

  return (
    <div className="min-h-full bg-surface-muted">
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center gap-3">
        <Avatar name={session.name} size={40} />
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Account</h1>
          <p className="text-sm text-ink-500">{session.name} · {session.email}</p>
        </div>
      </div>

      <Card tone="plain">
        <CardHeader icon={<IconBadge icon={<UserRound size={18} />} tone="sage" />} title="Profile" subtitle="How your name and role appear to your team." />
        <CardBody>
          <ProfileForm name={session.name} email={session.email} jobTitle={employee ? employee.jobTitle : null} department={employee?.department?.name ?? null} />
        </CardBody>
      </Card>

      <Card tone="plain">
        <CardHeader icon={<IconBadge icon={<Lock size={18} />} tone="orchid" />} title="Password" subtitle="Choose your own password to replace the temporary one." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
    </div>
  );
}
