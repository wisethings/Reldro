import Link from "next/link";
import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";

/**
 * Small building blocks for the Overview and the summary strips on other screens. Colour carries a
 * kind of thing, not a verdict: coral = needs attention, purple = review or information, gold =
 * follow-up work, green = nothing pending, neutral = structure. Counts are never coloured good or bad.
 */
export type Tint = "coral" | "orchid" | "gold" | "sage" | "neutral";

const TINT: Record<Tint, { tile: string; ring: string }> = {
  coral: { tile: "bg-coral-soft text-danger", ring: "border-coral" },
  orchid: { tile: "bg-orchid-soft text-orchid-deep", ring: "border-ink-200" },
  gold: { tile: "bg-olive-soft text-olive", ring: "border-ink-200" },
  sage: { tile: "bg-sage text-sage-deep", ring: "border-ink-200" },
  neutral: { tile: "bg-surface-sunken text-ink-600", ring: "border-ink-200" },
};

export function IconTile({ tint, children, size = "md" }: { tint: Tint; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-xl ${size === "sm" ? "h-9 w-9" : "h-11 w-11"} ${TINT[tint].tile}`}>
      {children}
    </span>
  );
}

/** A headline number with an icon. The whole card is a link to the list behind it. */
export function StatCard({ href, icon, tint, value, label, alert = false }: { href: string; icon: React.ReactNode; tint: Tint; value: number | string; label: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex flex-col items-start gap-2 max-md:[&:last-child:nth-child(odd)]:col-span-2 rounded-xl border bg-white p-3 transition-shadow hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${alert ? "border-coral" : "border-ink-200"}`}
    >
      <IconTile tint={tint}>{icon}</IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-semibold leading-none tabular-nums text-ink-900">{value}</span>
        <span className="mt-1 block text-xs leading-snug text-ink-600">{label}</span>
      </span>
      <ChevronRight size={16} aria-hidden className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

/** One sentence that answers "is there anything I need to do right now?" */
export function StatusBanner({ tone, title, body }: { tone: "calm" | "watch" | "urgent"; title: string; body: string }) {
  const style = {
    calm: { box: "border-sage-deep/30 bg-sage", icon: "bg-sage-deep text-white", text: "text-sage-deep", Icon: CheckCircle2 },
    watch: { box: "border-olive/30 bg-olive-soft", icon: "bg-olive text-white", text: "text-olive", Icon: TriangleAlert },
    urgent: { box: "border-coral bg-coral-soft", icon: "bg-danger text-white", text: "text-danger", Icon: TriangleAlert },
  }[tone];
  return (
    <div role="status" className={`flex items-center gap-3 rounded-xl border px-4 py-3 sm:gap-4 sm:px-5 ${style.box}`}>
      <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
        <style.Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink-900">{title}</p>
        <p className={`text-sm ${style.text === "text-danger" ? "text-ink-800" : "text-ink-700"}`}>{body}</p>
      </div>
    </div>
  );
}

export function Panel({ icon, tint, title, subtitle, action, children }: { icon: React.ReactNode; tint: Tint; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-200 bg-white">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-2 pt-4 sm:px-5">
        <IconTile tint={tint}>{icon}</IconTile>
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </header>
      <div className="space-y-2 p-3 sm:p-4">{children}</div>
    </section>
  );
}

/** A compact row inside a panel: icon, title with count, one line of detail, chevron. */
export function AttentionRow({ href, icon, tint, title, count, detail, alert = false }: { href: string; icon: React.ReactNode; tint: Tint; title: string; count: number; detail: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500 ${alert && count > 0 ? "border-coral/60 bg-coral-soft/20" : "border-ink-200"}`}
    >
      <IconTile tint={count === 0 && alert ? "neutral" : tint} size="sm">{icon}</IconTile>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium leading-snug text-ink-900">{title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${count > 0 && alert ? "bg-coral-soft text-danger" : "bg-surface-sunken text-ink-700"}`}>{count}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-ink-500">{detail}</span>
      </span>
      <ChevronRight size={16} aria-hidden className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export type ActivityItem = { key: string; at: Date; icon: React.ReactNode; tint: Tint; text: string; meta: string; href: string };

export function timeAgo(d: Date, now = new Date()): string {
  const min = Math.round((now.getTime() - d.getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityList({ items, empty }: { items: ActivityItem[]; empty: string }) {
  if (items.length === 0) return <p className="px-2 py-4 text-sm text-ink-500">{empty}</p>;
  return (
    <ol className="divide-y divide-ink-100">
      {items.map((a) => (
        <li key={a.key}>
          <Link href={a.href} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500">
            <IconTile tint={a.tint} size="sm">{a.icon}</IconTile>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink-900">{a.text}</span>
              <span className="block truncate text-xs text-ink-500">{a.meta}</span>
            </span>
            <time dateTime={a.at.toISOString()} className="shrink-0 pt-0.5 text-xs text-ink-500">{timeAgo(a.at)}</time>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function PulseItem({ icon, tint, value, label, previous, days }: { icon: React.ReactNode; tint: Tint; value: number; label: string; previous: number; days: number }) {
  const diff = value - previous;
  return (
    <div className="rounded-lg border border-ink-200 p-3">
      <div className="flex items-center gap-2">
        <IconTile tint={tint} size="sm">{icon}</IconTile>
        <span className="text-2xl font-semibold tabular-nums text-ink-900">{value}</span>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-700">{label}</p>
      <p className="text-[11px] text-ink-500">
        {diff === 0 ? `Same as the previous ${days} days` : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs the previous ${days} days`}
      </p>
    </div>
  );
}

/** A compact row of numbers for the top of a list screen. Neutral by default so counts never read as verdicts. */
export function StatStrip({ items }: { items: { label: string; value: number | string; href?: string; tint?: Tint; alert?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s) => {
        const body = (
          <dl>
            <dt className="text-xs text-ink-600">{s.label}</dt>
            <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${s.alert ? "text-danger" : "text-ink-900"}`}>{s.value}</dd>
          </dl>
        );
        const cls = `block rounded-xl border bg-white px-3 py-2.5 ${s.alert ? "border-coral" : "border-ink-200"}`;
        return s.href ? (
          <Link key={s.label} href={s.href} className={`${cls} hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-brand-500`}>{body}</Link>
        ) : (
          <div key={s.label} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}
