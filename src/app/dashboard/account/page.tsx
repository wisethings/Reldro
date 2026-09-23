import { requireSession } from "@/lib/auth/guards";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Account</h1>
        <p className="text-sm text-ink-500">{session.name} · {session.email}</p>
      </div>

      <Card>
        <CardHeader title="Password" subtitle="Set your own password instead of using a temporary one." />
        <CardBody>
          <ChangePasswordForm />
        </CardBody>
      </Card>
    </div>
  );
}
