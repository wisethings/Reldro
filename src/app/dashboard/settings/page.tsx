import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrgProfileForm } from "@/components/settings/OrgProfileForm";
import { changeSubscriptionTier } from "@/lib/actions/settings";

const TIERS = [
  { tier: "STARTER" as const, name: "Starter", price: 499, blurb: "For smaller teams." },
  { tier: "GROWTH" as const, name: "Growth", price: 1500, blurb: "For growing organizations." },
  { tier: "ENTERPRISE" as const, name: "Enterprise", price: 5000, blurb: "Custom pricing available." },
];

export default async function SettingsPage() {
  const session = await requireRole(["COMPANY_ADMIN"]);
  if (!session.organizationId) redirect("/login");

  const [org, subscription, invoices] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.organizationId } }),
    prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
    prisma.invoice.findMany({ where: { organizationId: session.organizationId }, orderBy: { issuedAt: "desc" }, take: 5 }),
  ]);
  if (!org) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Organization profile, billing, and permissions.</p>
      </div>

      <Card>
        <CardHeader title="Organization profile" />
        <CardBody>
          <OrgProfileForm org={org} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Billing" subtitle={subscription ? `Current plan: ${subscription.tier} · $${subscription.pricePerMonth}/mo` : "No active subscription"} />
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.tier} className={`rounded-lg border p-4 ${subscription?.tier === t.tier ? "border-brand-600 bg-brand-50" : "border-ink-200"}`}>
                <p className="text-sm font-semibold text-ink-900">{t.name}</p>
                <p className="text-lg font-semibold text-ink-900">${t.price}<span className="text-xs font-normal text-ink-500">/mo</span></p>
                <p className="text-xs text-ink-500">{t.blurb}</p>
                <form action={changeSubscriptionTier.bind(null, t.tier)} className="mt-3">
                  <button
                    disabled={subscription?.tier === t.tier}
                    className="w-full rounded-full border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
                  >
                    {subscription?.tier === t.tier ? "Current plan" : "Switch plan"}
                  </button>
                </form>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-400">
            Expert-help engagements are billed separately; Reldro takes a platform fee from those transactions.
            Payment processing (Stripe) is not yet wired up in this environment.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent invoices" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm text-ink-800">{inv.description}</p>
                <p className="text-xs text-ink-500">{inv.issuedAt.toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-900">${(inv.amount / 100).toLocaleString()}</span>
                <Badge tone={inv.status === "PAID" ? "green" : "amber"}>{inv.status.toLowerCase()}</Badge>
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="p-5 text-sm text-ink-500">No invoices yet.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Permissions" />
        <CardBody className="space-y-2 text-sm text-ink-700">
          <p>Company admins have full organization access. Employees see only their own profile, learning, and assigned workflows.</p>
          <p>Each organization's data is fully isolated — no user can access another organization's records.</p>
        </CardBody>
      </Card>
    </div>
  );
}
