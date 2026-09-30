import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

/** Support inbox: one row per admin who has written in, newest activity first. Message text is what the admin chose to send us. */
export default async function SupportInbox() {
  const latest = await prisma.supportMessage.groupBy({ by: ["userId"], _max: { createdAt: true }, _count: { _all: true }, orderBy: { _max: { createdAt: "desc" } }, take: 100 });
  const ids = latest.map((l) => l.userId);
  const [users, unread, last] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, organization: { select: { name: true, isDemo: true } } } }),
    prisma.supportMessage.groupBy({ by: ["userId"], where: { userId: { in: ids }, fromStaff: false, readAt: null }, _count: { _all: true } }),
    Promise.all(ids.map((userId) => prisma.supportMessage.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }))),
  ]);
  const unreadBy = new Map(unread.map((u) => [u.userId, u._count._all]));
  const userBy = new Map(users.map((u) => [u.id, u]));
  const lastBy = new Map(last.filter(Boolean).map((m) => [m!.userId, m!]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Support inbox</h1>
        <p className="text-sm text-ink-500">Product questions from company admins, sent from the help button in their workspace. Each company sees only its own conversation. Reply here and the admin sees it in the app.</p>
      </div>
      {latest.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center text-sm text-ink-500">No messages yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-200">
            {latest.map((l) => {
              const u = userBy.get(l.userId);
              const m = lastBy.get(l.userId);
              const n = unreadBy.get(l.userId) ?? 0;
              return (
                <li key={l.userId}>
                  <Link href={`/platform-admin/support/${l.userId}`} className="flex items-start gap-3 px-5 py-4 hover:bg-ink-50">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
                        {u?.name ?? "Unknown admin"}
                        <span className="text-xs font-normal text-ink-500">{u?.organization?.name ?? "No organization"}</span>
                        {u?.organization?.isDemo && <Badge tone="gold">Sample workspace</Badge>}
                        {n > 0 && <Badge tone="red">{n} new</Badge>}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink-600">{m?.fromStaff ? "You: " : ""}{m?.body}</p>
                    </div>
                    <time dateTime={m?.createdAt.toISOString()} className="shrink-0 text-xs text-ink-500">{m?.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</time>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
