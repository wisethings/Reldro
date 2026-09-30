import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export default async function SetupSupportPage() {
  const rows = await prisma.auditLog.findMany({ where: { action: "setup_support.requested" }, orderBy: { createdAt: "desc" }, take: 100, include: { organization: { select: { name: true } } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Setup support requests</h1>
        <p className="text-sm text-ink-500">Customers who asked for optional, paid setup or advisor help. Follow up to agree scope and price. Nothing is sold by the request itself.</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center text-sm text-ink-500">No requests yet.</p>
      ) : (
        <Card>
          <ul className="divide-y divide-ink-200">
            {rows.map((r) => {
              const m = (r.metadata ?? {}) as { need?: string; by?: string };
              return (
                <li key={r.id} className="space-y-1 px-5 py-4">
                  <p className="text-sm font-medium text-ink-900">{r.organization?.name ?? "Unknown organization"}</p>
                  <p className="text-sm text-ink-700">{m.need}</p>
                  <p className="text-xs text-ink-500">Requested by {m.by ?? "an admin"} · {r.createdAt.toLocaleString()}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
