import Link from "next/link";
import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { Gap, Kpi, SiteRow } from "@/lib/safety/metrics";

export function Bars({ rows, empty = "Nothing to show yet.", unit = "" }: { rows: { label: string; count: number; href?: string }[]; empty?: string; unit?: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => {
        const inner = (
          <>
            <span title={r.label} className={`min-w-0 text-sm leading-snug ${i === 0 ? "font-medium text-ink-900" : "text-ink-700"} line-clamp-2 break-words`}>{r.label}</span>
            <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-ink-100"><span className={`block h-full rounded-full ${i === 0 ? "bg-orchid-deep" : "bg-orchid-deep/55"}`} style={{ width: `${(r.count / max) * 100}%` }} /></span>
            <span className={`text-right text-sm tabular-nums ${i === 0 ? "font-semibold text-ink-900" : "text-ink-600"}`}>{r.count}{unit}</span>
          </>
        );
        const cls = "grid grid-cols-[minmax(0,1fr)_5.5rem_2.5rem] items-center gap-3 rounded-md px-1 py-1.5 sm:grid-cols-[minmax(0,1fr)_8rem_3rem]";
        return <li key={`${i}-${r.label}`}>{r.href ? <Link href={r.href} className={`${cls} hover:bg-surface-hover`}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
      })}
    </ul>
  );
}

export function Block({ title, note, children, className = "", id }: { title: string; note?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`surface p-4 sm:p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {note && <p className="mt-0.5 text-xs leading-snug text-ink-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Figure({ label, value, tone, note }: { label: string; value: string | number; tone?: "bad" | "good"; note?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dd className={`text-2xl font-semibold tabular-nums ${tone === "bad" ? "text-danger" : tone === "good" ? "text-sage-deep" : "text-ink-900"}`}>{value}</dd>
      <dt className="text-xs text-ink-600">{label}</dt>
      {note && <p className="text-xs text-ink-500">{note}</p>}
    </div>
  );
}

export function Figures({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="surface p-4 sm:p-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">{children}</dl>
    </section>
  );
}

/** "+4 vs the previous 90 days": the change since the period before, with the direction written out. */
export function Delta({ now, before, days, goodWhenDown = true }: { now: number; before: number; days: number; goodWhenDown?: boolean }) {
  if (before === 0 && now === 0) return null;
  const diff = now - before;
  const text = diff === 0 ? `Same as the previous ${days} days` : `${diff > 0 ? "Up" : "Down"} ${Math.abs(diff)} from the previous ${days} days`;
  const good = diff === 0 ? null : goodWhenDown ? diff < 0 : diff > 0;
  return <span className={good === null ? "text-ink-500" : good ? "text-sage-deep" : "text-amber-deep"}>{text}</span>;
}

const STATUS = {
  met: { label: "On target", cls: "bg-sage text-sage-deep", Icon: CheckCircle2 },
  missed: { label: "Off target", cls: "bg-coral-soft text-danger", Icon: AlertTriangle },
  nodata: { label: "No data yet", cls: "bg-surface-sunken text-ink-600", Icon: MinusCircle },
} as const;

export function StatusChip({ status }: { status: Kpi["status"] }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${s.cls}`}><s.Icon size={12} aria-hidden />{s.label}</span>;
}

/** Each number set against the company's own target, so "good" means good for them, not for a generic benchmark. */
export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const body = (
          <>
            <p className="text-xs font-medium text-ink-600">{k.label}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className={`text-2xl font-semibold tabular-nums ${k.status === "missed" ? "text-danger" : "text-ink-900"}`}>{k.display}</p>
              <StatusChip status={k.status} />
            </div>
            <p className="mt-0.5 text-xs text-ink-500">Target: {k.target}</p>
            <p className="mt-1 text-xs leading-snug text-ink-500">{k.note}</p>
          </>
        );
        return (
          <li key={k.key} className="surface">
            {k.href ? <Link href={k.href} className="block h-full rounded-[inherit] p-4 hover:bg-surface-hover">{body}</Link> : <div className="p-4">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

export function GapList({ gaps, empty }: { gaps: Gap[]; empty: string }) {
  if (gaps.length === 0) return <p className="flex items-center gap-2 text-sm text-sage-deep"><CheckCircle2 size={16} aria-hidden /> {empty}</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {gaps.map((g) => (
        <li key={g.id}>
          <Link href={g.href} className="flex items-start gap-3 py-2.5 hover:bg-surface-hover sm:-mx-2 sm:px-2 sm:rounded-md">
            <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${g.tone === "bad" ? "bg-danger" : "bg-amber-deep"}`} />
            <span className="min-w-0 flex-1 text-sm text-ink-800">{g.text}</span>
            <span className="shrink-0 text-xs font-medium text-orchid-deep">Open →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A bar with rounded top corners and a square bottom, so it sits flat on the baseline. */
function topRounded(x: number, base: number, w: number, h: number): string {
  const r = Math.min(3, h, w / 2);
  const top = base - h;
  return `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${base} Z`;
}

/** Reports per week (or month), with the serious ones drawn on top so a rising trend of near misses reads differently from a rising trend of injuries. */
export function TrendChart({ points, periodLabel }: { points: { label: string; count: number; serious: number }[]; periodLabel: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const W = 640, H = 150, padL = 28, padB = 22, padT = 10;
  const innerW = W - padL, innerH = H - padB - padT;
  const slot = innerW / Math.max(1, points.length);
  const bar = Math.min(26, slot * 0.62);
  const base = padT + innerH;
  const y = (n: number) => base - (n / max) * innerH;
  const every = Math.ceil(points.length / 6);
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Reports ${periodLabel}. ${points.map((p) => `${p.label}: ${p.count}`).join(", ")}`} className="h-auto w-full">
        {ticks.filter((t) => t !== 0).map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-ink-100" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-ink-500 text-[10px]">{t}</text>
          </g>
        ))}
        <text x={padL - 6} y={base + 3} textAnchor="end" className="fill-ink-500 text-[10px]">0</text>
        {points.map((p, i) => {
          const x = padL + i * slot + (slot - bar) / 2;
          const h = Math.max(p.count > 0 ? 2 : 0, base - y(p.count));
          const hs = p.serious > 0 ? Math.max(2, base - y(p.serious)) : 0;
          return (
            <g key={i}>
              <title>{`${p.label}: ${p.count} ${p.count === 1 ? "report" : "reports"}${p.serious ? `, ${p.serious} serious or worse` : ""}`}</title>
              {h > 0 && <path d={topRounded(x, base, bar, h)} className="fill-orchid-deep/45" />}
              {hs > 0 && <path d={topRounded(x, base, bar, hs)} className="fill-danger" />}
              {(points.length - 1 - i) % every === 0 && <text x={x + bar / 2} y={H - 6} textAnchor="middle" className="fill-ink-500 text-[10px]">{p.label}</text>}
            </g>
          );
        })}
        {/* The baseline is drawn last and the bars end exactly on it, so every bar sits flush on the line. */}
        <line x1={padL} x2={W} y1={base} y2={base} className="stroke-ink-300" strokeWidth={1} />
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-orchid-deep/45" />All reports</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-danger" />Serious or life-threatening</span>
      </figcaption>
      <table className="sr-only">
        <caption>Reports {periodLabel}</caption>
        <thead><tr><th>Period</th><th>Reports</th><th>Serious or worse</th></tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{p.label}</td><td>{p.count}</td><td>{p.serious}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

const cellTone = (bad: boolean, none = false) => (none ? "text-ink-400" : bad ? "font-semibold text-danger" : "text-ink-800");

/** Every site side by side, worst first. A row opens that site's own page. */
export function SiteTable({ rows, days }: { rows: SiteRow[]; days: number }) {
  if (rows.length === 0) return <p className="text-sm text-ink-500">No active sites yet.</p>;
  const pctCell = (v: number | null, target: number | null) => (v === null ? "—" : `${v}%`);
  const head = "px-2 py-2 text-left text-xs font-medium text-ink-500";
  return (
    <>
      <ul className="divide-y divide-ink-100 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/dashboard/sites/${r.id}?days=${days}`} className="block py-3 hover:bg-surface-hover">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-ink-900">{r.name}</span>
                <span className={`shrink-0 text-xs font-medium ${r.missedTargets > 0 ? "text-danger" : "text-sage-deep"}`}>{r.missedTargets > 0 ? `${r.missedTargets} off target` : "On target"}</span>
              </div>
              <dl className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-ink-600">
                <div><dt>Open reports</dt><dd className="font-medium text-ink-900">{r.openReports}</dd></div>
                <div><dt>Overdue actions</dt><dd className={cellTone(r.overdueActions > 0)}>{r.overdueActions}</dd></div>
                <div><dt>Inspections late</dt><dd className={cellTone(r.inspectionsOverdue > 0)}>{r.inspectionsOverdue}</dd></div>
                <div><dt>Talks acknowledged</dt><dd className="font-medium text-ink-900">{pctCell(r.talkPct, null)}</dd></div>
                <div><dt>Certifications</dt><dd className="font-medium text-ink-900">{pctCell(r.certPct, null)}</dd></div>
                <div><dt>Response overdue</dt><dd className={cellTone(r.responseOverdue > 0)}>{r.responseOverdue}</dd></div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Sites compared</caption>
          <colgroup><col className="w-[22%]" /><col /><col /><col /><col /><col /><col /><col className="w-[12%]" /></colgroup>
          <thead><tr className="border-b border-ink-100"><th scope="col" className={head}>Site</th><th scope="col" className={head}>Reports ({days}d)</th><th scope="col" className={head}>Response overdue</th><th scope="col" className={head}>Overdue actions</th><th scope="col" className={head}>Inspections late</th><th scope="col" className={head}>Talks ack.</th><th scope="col" className={head}>Certifications</th><th scope="col" className={head}>Targets</th></tr></thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-hover">
                <th scope="row" className="px-2 py-2.5 text-left font-medium text-ink-900"><Link href={`/dashboard/sites/${r.id}?days=${days}`} className="block truncate hover:underline">{r.name}</Link></th>
                <td className="px-2 py-2.5 tabular-nums text-ink-800">{r.reports}<span className="text-ink-400"> · {r.openReports} open</span></td>
                <td className={`px-2 py-2.5 tabular-nums ${cellTone(r.responseOverdue > 0)}`}>{r.responseOverdue}</td>
                <td className={`px-2 py-2.5 tabular-nums ${cellTone(r.overdueActions > 0)}`}>{r.overdueActions}</td>
                <td className={`px-2 py-2.5 tabular-nums ${cellTone(r.inspectionsOverdue > 0)}`}>{r.inspectionsOverdue}</td>
                <td className="px-2 py-2.5 tabular-nums text-ink-800">{pctCell(r.talkPct, null)}</td>
                <td className="px-2 py-2.5 tabular-nums text-ink-800">{pctCell(r.certPct, null)}{r.certProblems > 0 && <span className="text-danger"> · {r.certProblems} gaps</span>}</td>
                <td className={`px-2 py-2.5 text-xs font-medium ${r.missedTargets > 0 ? "text-danger" : "text-sage-deep"}`}>{r.missedTargets > 0 ? `${r.missedTargets} off target` : "On target"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
