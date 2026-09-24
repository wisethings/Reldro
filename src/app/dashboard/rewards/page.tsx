import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPointsBalance, ensureDefaultRewardCatalog } from "@/lib/rewards";
import { RedeemButton } from "@/components/rewards/RedeemButton";

const CATEGORY_LABEL: Record<string, string> = {
  GIFT_CARD: "Gift card",
  LEARNING_CREDIT: "Learning credit",
  MERCHANDISE: "Merchandise",
  PTO: "PTO",
  DONATION: "Donation",
  EXPERIENCE: "Experience",
  CUSTOM: "Custom",
};

export default async function RewardsPage() {
  const session = await requireSession();
  if (!session.organizationId) redirect("/login");

  await ensureDefaultRewardCatalog(session.organizationId);

  const [balance, catalog, history] = await Promise.all([
    session.employeeId ? getPointsBalance(session.employeeId) : Promise.resolve(0),
    prisma.rewardItem.findMany({ where: { organizationId: session.organizationId, active: true }, orderBy: { pointCost: "asc" } }),
    session.employeeId
      ? prisma.pointsTransaction.findMany({ where: { employeeId: session.employeeId }, orderBy: { createdAt: "desc" }, take: 50 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">AI Rewards</h1>
          <p className="text-sm text-ink-500">Earned from real learning, workflow adoption, and recognition — never from logging in.</p>
        </div>
        {session.role === "COMPANY_ADMIN" && (
          <Link
            href="/dashboard/settings"
            className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            Manage reward catalog
          </Link>
        )}
      </div>

      {session.employeeId ? (
        <Card>
          <CardBody>
            <p className="text-xs font-medium text-ink-500">You have</p>
            <p className="text-3xl font-semibold text-ink-900">{balance.toLocaleString()} points</p>
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-ink-500">Points and redemption are earned by employees. Here's the reward catalog available to your team.</p>
      )}

      <Card>
        <CardHeader title="Available rewards" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {catalog.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">{item.name}</p>
                  <Badge tone="neutral">{CATEGORY_LABEL[item.category] ?? item.category}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{item.description}</p>
                <p className="mt-1 text-xs font-medium text-orchid-deep">{item.pointCost.toLocaleString()} points</p>
              </div>
              {session.employeeId && <RedeemButton rewardItemId={item.id} pointCost={item.pointCost} balance={balance} />}
            </div>
          ))}
          {catalog.length === 0 && <p className="p-5 text-sm text-ink-500">No rewards are available yet — check with your admin.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reward history" subtitle="Every point, in and out" />
        <CardBody className="divide-y divide-ink-200 p-0">
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink-800">{t.reason}</p>
                <p className="text-xs text-ink-400">{t.createdAt.toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${t.amount >= 0 ? "text-sage-deep" : "text-ink-500"}`}>
                {t.amount >= 0 ? "+" : ""}
                {t.amount}
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="p-5 text-sm text-ink-500">No point activity yet — complete a learning path or simulation to get started.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
