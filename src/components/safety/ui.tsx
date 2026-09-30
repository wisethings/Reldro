import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { actionStatusInfo, investigationStatusInfo, reportStatusInfo, severityInfo } from "@/lib/safety/pack";

/** `suggested` marks a seriousness level nobody on the response side has confirmed yet, so it never reads as an official assessment. */
export function SeverityBadge({ severity, suggested = false }: { severity: string; suggested?: boolean }) {
  const s = severityInfo(severity);
  return (
    <Badge tone={suggested ? "neutral" : s.tone}>
      {suggested ? `${s.label} (suggested)` : s.label}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  const s = reportStatusInfo(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ActionStatusBadge({ status }: { status: string }) {
  const s = actionStatusInfo(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function InvestigationStatusBadge({ status }: { status: string }) {
  const s = investigationStatusInfo(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "3 days overdue" / "due in 2 days" / "no due date" - plain, never just a color. */
export function dueLabel(due: Date | null, open: boolean): { text: string; overdue: boolean } {
  if (!due) return { text: "No due date", overdue: false };
  if (!open) return { text: `Due ${fmtDate(due)}`, overdue: false };
  const days = Math.ceil((due.getTime() - Date.now()) / 86400_000);
  if (days < 0) return { text: `${-days} day${days === -1 ? "" : "s"} overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, overdue: false };
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, href, cta, heading = false }: { title: string; body?: string; href?: string; cta?: string; heading?: boolean }) {
  const Title = heading ? "h1" : "p";
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white px-6 py-10 text-center">
      <Title className="text-sm font-medium text-ink-800">{title}</Title>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{body}</p>}
      {href && cta && (
        <Link href={href} className="mt-4 inline-block rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          {cta}
        </Link>
      )}
    </div>
  );
}

export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <EmptyState heading title="You don't have access to this" body={`Your role doesn't include ${what}. If you think that's a mistake, ask your safety lead or company admin.`} href="/dashboard/overview" cta="Back to home" />
    </div>
  );
}

export function Photos({ items }: { items: unknown }) {
  const photos = (Array.isArray(items) ? items : []) as { name: string; dataUri: string }[];
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={p.dataUri} alt={p.name} className="h-28 w-28 rounded-lg border border-ink-200 object-cover" />
      ))}
    </div>
  );
}

/** Shown wherever AI text appears, so nobody mistakes a draft for a finding. */
export function DraftLabel({ generatedBy }: { generatedBy: "model" | "rules" }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-orchid-deep">
      {generatedBy === "model" ? "AI-assisted draft" : "Draft from built-in checklists"} · review and edit before using
    </p>
  );
}
