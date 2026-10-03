import { NextRequest, NextResponse } from "next/server";
import { getFreshSession } from "@/lib/auth/guards";
import { loadViewer } from "@/lib/safety/access";
import { logAudit } from "@/lib/audit";
import { toCsv, csvResponseHeaders } from "@/lib/csv";
import { datasetSpec } from "@/lib/safety/exportSpec";
import { buildDataset } from "@/lib/safety/exports";

/**
 * ?dataset=reports|actions|inspections|talks|certifications &site=<id> &days=30|90|365 &cols=key,key
 * Safety team only. Unknown columns are ignored; with no valid columns the default set is used.
 */
const MAX_ROWS = 100_000;

export async function GET(request: NextRequest) {
  const session = await getFreshSession();
  if (!session?.organizationId || session.role === "PLATFORM_ADMIN" || session.role === "SPECIALIST") return new NextResponse("Unauthorized", { status: 401 });
  const v = await loadViewer(session);
  if (!v.isSafetyTeam) return new NextResponse("Forbidden", { status: 403 });

  const q = request.nextUrl.searchParams;
  const spec = datasetSpec(q.get("dataset"));
  if (!spec) return new NextResponse("Unknown dataset", { status: 400 });
  const days = [30, 90, 365].includes(Number(q.get("days"))) ? Number(q.get("days")) : 90;
  const wanted = (q.get("cols") ?? "").split(",").filter(Boolean);
  const columns = spec.columns.filter((c) => (wanted.length ? wanted.includes(c.key) : c.on));
  const picked = columns.length ? columns : spec.columns.filter((c) => c.on);

  const table = await buildDataset(v, spec.key, { siteId: q.get("site") || null, days });
  if (!table) return new NextResponse("Unknown dataset", { status: 400 });
  if (table.rows.length > MAX_ROWS) return new NextResponse(`That is more than ${MAX_ROWS.toLocaleString("en-US")} rows. Choose a shorter period or a single site.`, { status: 413 });
  await logAudit({ organizationId: v.organizationId, userId: v.userId, action: "safety.exported", entityType: spec.key, metadata: { days, rows: table.rows.length, site: q.get("site") || "all" } });

  const csv = toCsv(table.rows, picked.map((c) => ({ key: c.key, label: c.label })));
  return new NextResponse(csv, { headers: csvResponseHeaders(`reldro-${table.fileLabel}-${days}d.csv`) });
}
