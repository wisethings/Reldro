import { Lock } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Avatar name={session.name} size={40} />
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Account</h1>
          <p className="text-sm text-ink-500">{session.name} · {session.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader icon={<IconBadge icon={<Lock size={18} />} tone="orchid" />} title="Password" subtitle="Choose your own password to replace the temporary one." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
