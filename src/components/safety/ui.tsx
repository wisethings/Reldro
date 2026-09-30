import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { actionStatusInfo, investigationStatusInfo, reportStatusInfo, severityInfo } from "@/lib/safety/pack";

/**
 * `suggested` marks a seriousness level nobody on the response side has confirmed yet, so it never reads as an official
 * assessment. It keeps its colour (so urgency still shows) but gets a dashed outline; `compact` drops the words for dense tables.
 */
export function SeverityBadge({ severity, suggested = false, compact = false }: { severity: string; suggested?: boolean; compact?: boolean }) {
  const s = severityInfo(severity);
  return (
    <Badge tone={s.tone} className={suggested ? "border border-dashed border-current/50" : undefined}>
      {s.label}
      {suggested && (compact ? <span className="sr-only"> (suggested)</span> : " (suggested)")}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  const s = reportStatusInfo(status);
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Four slim steps under a report's status badge: New, Assigned, Under investigation, Closed. */
export function ReportProgress({ status }: { status: string }) {
  const step = status === "NEW" ? 1 : status === "ASSIGNED" ? 2 : status === "CLOSED" ? 4 : 3;
  return (
    <span aria-hidden className="mt-1.5 flex w-full max-w-[8.5rem] gap-0.5">
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? (status === "CLOSED" ? "bg-sage-deep" : "bg-orchid-deep") : "bg-ink-200"}`} />
      ))}
    </span>
  );
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

/** Compact date for table cells: "Sep 29". */
export function fmtShort(d: Date | string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
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

/**
 * A page-level empty state: a soft illustration of what will fill the page, a plain explanation, and up to
 * three next steps. Used when a whole list is empty, not for small inline "nothing here" lines.
 */
export function EmptyHero({
  title,
  body,
  kind = "reports",
  steps = [],
}: {
  title: string;
  body: string;
  kind?: "reports" | "investigations" | "actions";
  steps?: { href: string; title: string; body: string }[];
}) {
  const chip = kind === "reports" ? "New" : kind === "investigations" ? "Under investigation" : "Open";
  const prefix = kind === "reports" ? "SR" : kind === "investigations" ? "INV" : "A";
  const bar = "h-2 rounded-full bg-ink-200/70";
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="relative bg-gradient-to-b from-orchid-soft/70 via-orchid-soft/30 to-white px-4 pt-8 text-center">
        <div aria-hidden className="mx-auto flex h-40 max-w-xl items-start justify-center gap-3 overflow-hidden px-1 pt-1 [mask-image:linear-gradient(to_bottom,black_50%,transparent)]">
          {[0.55, 1, 0.55].map((scale, idx) => (
            <div key={idx} className="w-44 shrink-0 rounded-xl border border-ink-200/70 bg-white p-3 shadow-sm" style={{ transform: `translateY(${idx === 1 ? 0 : 20}px)`, opacity: idx === 1 ? 1 : 0.7 }}>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-md bg-orchid-soft" />
                <span className={`${bar} w-16`} />
              </div>
              <p className="mt-3 text-xs font-medium text-orchid-deep">{idx === 1 ? chip : ""}</p>
              <div className="mt-2 space-y-1.5 rounded-lg bg-ink-50 p-2">
                <p className="text-[10px] tabular-nums text-ink-400">{prefix}-0{idx + 1}</p>
                <span className={`${bar} block w-full`} />
                <span className={`${bar} block w-2/3`} />
              </div>
              <span style={{ width: `${scale * 100}%` }} className={`${bar} mt-2 block`} />
            </div>
          ))}
        </div>
        <div className="-mt-3 pb-8">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">{body}</p>
        </div>
      </div>
      {steps.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-ink-100 p-3 sm:grid-cols-3">
          {steps.map((st) => (
            <Link key={st.href + st.title} href={st.href} className="group rounded-xl border border-ink-200/80 p-3 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand-500">
              <p className="text-sm font-medium text-ink-900">{st.title}</p>
              <p className="mt-0.5 text-xs text-ink-600">{st.body}</p>
              <p className="mt-2 text-xs font-medium text-orchid-deep group-hover:text-oxblood">Open →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function NoAccess({ what = "this page" }: { what?: string }) {
  return (
    <div className="mx-auto max-w-lg p-6">
      <EmptyState heading title="You do not have access to this" body={`Your role does not include ${what}. If you think this is a mistake, ask your safety lead or company admin.`} href="/dashboard/overview" cta="Go to home" />
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
    <p className="text-xs font-medium uppercase tracking-wide text-orchid-deep">
      {generatedBy === "model" ? "AI-assisted draft" : "Draft from built-in checklists"} · review and edit before using
    </p>
  );
}
