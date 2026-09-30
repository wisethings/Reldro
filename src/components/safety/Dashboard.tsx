import Link from "next/link";
import { CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";

/**
 * Compact building blocks for the Overview and the summary strips on list screens. Colour marks the
 * kind of thing, not a verdict: coral = needs attention, purple = review or information, gold = follow-up
 * work, green = nothing pending, neutral = structure. Counts are never coloured good or bad.
 */
export type Tint = "coral" | "orchid" | "gold" | "amber" | "sky" | "teal" | "indigo" | "sage" | "neutral";

const TINT: Record<Tint, string> = {
  coral: "bg-coral-soft text-danger",
  orchid: "bg-orchid-soft text-orchid-deep",
  gold: "bg-gold-soft text-gold-deep",
  amber: "bg-amber-soft text-amber-deep",
  sky: "bg-sky-soft text-sky-deep",
  teal: "bg-teal-soft text-teal-deep",
  indigo: "bg-indigo-soft text-indigo-deep",
  sage: "bg-sage text-sage-deep",
  neutral: "bg-ink-100 text-ink-600",
};

const TEXT: Record<Tint, string> = {
  coral: "text-danger",
  orchid: "text-orchid-deep",
  gold: "text-gold-deep",
  amber: "text-amber-deep",
  sky: "text-sky-deep",
  teal: "text-teal-deep",
  indigo: "text-indigo-deep",
  sage: "text-sage-deep",
  neutral: "text-ink-900",
};

export function IconTile({ tint, children, size = "md" }: { tint: Tint; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-lg ${size === "sm" ? "h-6 w-6" : "h-8 w-8"} ${TINT[tint]}`}>
      {children}
    </span>
  );
}

/** A metric cell. The row of them is one bordered bar with hairline dividers. */
export function StatCard({ href, icon, tint, value, label, alert = false }: { href: string; icon: React.ReactNode; tint: Tint; value: number | string; label: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 bg-white px-3.5 py-3 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
    >
      <IconTile tint={tint}>{icon}</IconTile>
      <span className="min-w-0 flex-1">
        <span className={`block text-xl font-semibold leading-none tabular-nums ${alert ? TEXT[tint] : "text-ink-900"}`}>{value}</span>
        <span className="mt-1 line-clamp-2 text-xs leading-tight text-ink-600">{label}</span>
      </span>
      <ChevronRight size={14} aria-hidden className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 lg:block" />
    </Link>
  );
}

export function StatBar({ children, cols }: { children: React.ReactNode; cols: 4 | 5 }) {
  return (
    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-200/80 bg-ink-200/80 ${cols === 5 ? "md:grid-cols-5" : "md:grid-cols-4"} [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1`}>
      {children}
    </div>
  );
}

/** One sentence that answers "is there anything I need to do right now?" */
export function StatusBanner({ tone, title, body }: { tone: "calm" | "watch" | "urgent"; title: string; body: string }) {
  const style = {
    calm: { box: "border-sage-deep/20 bg-sage/60", icon: "text-sage-deep", Icon: CheckCircle2 },
    watch: { box: "border-amber-deep/20 bg-amber-soft/70", icon: "text-amber-deep", Icon: TriangleAlert },
    urgent: { box: "border-coral/60 bg-coral-soft/60", icon: "text-danger", Icon: TriangleAlert },
  }[tone];
  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${style.box}`}>
      <style.Icon size={16} aria-hidden className={`mt-0.5 shrink-0 ${style.icon}`} />
      <p className="min-w-0 text-[13px] leading-snug text-ink-800">
        <span className="font-semibold text-ink-900">{title}.</span> {body}
      </p>
    </div>
  );
}

export function Panel({ icon, tint, title, subtitle, action, children }: { icon: React.ReactNode; tint: Tint; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-ink-100 px-3.5 py-2.5">
        <IconTile tint={tint} size="sm">{icon}</IconTile>
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="text-sm font-semibold leading-tight text-ink-900">{title}</h2>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

/** A flat row inside a panel: icon, title with count, one line of detail, chevron. */
export function AttentionRow({ href, icon, tint, title, count, detail, alert = false }: { href: string; icon: React.ReactNode; tint: Tint; title: string; count: number; detail: string; alert?: boolean }) {
  const quiet = count === 0;
  return (
    <Link href={href} className="group flex items-center gap-3 border-b border-ink-100 px-3.5 py-2.5 outline-none last:border-b-0 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
      <IconTile tint={quiet ? "neutral" : tint} size="sm">{icon}</IconTile>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`text-[13px] font-medium leading-snug ${quiet ? "text-ink-700" : "text-ink-900"}`}>{title}</span>
          <span className={`shrink-0 rounded-md px-1.5 text-[11px] font-semibold leading-[18px] tabular-nums ${!quiet ? TINT[tint] : "bg-ink-100 text-ink-700"}`}>{count}</span>
        </span>
        <span className="mt-px block truncate text-xs text-ink-500">{detail}</span>
      </span>
      <ChevronRight size={14} aria-hidden className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5" />
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
  if (items.length === 0) return <p className="px-3.5 py-4 text-sm text-ink-500">{empty}</p>;
  return (
    <ol>
      {items.map((a) => (
        <li key={a.key}>
          <Link href={a.href} className="flex items-start gap-3 border-b border-ink-100 px-3.5 py-2 outline-none last:border-b-0 hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
            <span className="mt-0.5"><IconTile tint={a.tint} size="sm">{a.icon}</IconTile></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-ink-900">{a.text}</span>
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
    <div className="bg-white px-3.5 py-3">
      <div className="flex items-center gap-2">
        <IconTile tint={tint} size="sm">{icon}</IconTile>
        <span className="text-lg font-semibold tabular-nums text-ink-900">{value}</span>
      </div>
      <p className="mt-1.5 text-xs font-medium text-ink-800">{label}</p>
      <p className="text-[11px] text-ink-500">
        {diff === 0 ? `Same as the previous ${days} days` : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs the previous ${days} days`}
      </p>
    </div>
  );
}

export function PulseGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-px bg-ink-100">{children}</div>;
}

/** A compact row of numbers for the top of a list screen. Neutral by default so counts never read as verdicts. */
export function StatStrip({ items }: { items: { label: string; value: number | string; href?: string; tint?: Tint; alert?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-200/80 bg-ink-200/80 sm:grid-cols-4">
      {items.map((s) => {
        const body = (
          <dl>
            <dt className="text-xs text-ink-600">{s.label}</dt>
            <dd className={`mt-0.5 text-lg font-semibold leading-tight tabular-nums ${s.alert ? "text-danger" : "text-ink-900"}`}>{s.value}</dd>
          </dl>
        );
        return s.href ? (
          <Link key={s.label} href={s.href} className="block bg-white px-3.5 py-2.5 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">{body}</Link>
        ) : (
          <div key={s.label} className="bg-white px-3.5 py-2.5">{body}</div>
        );
      })}
    </div>
  );
}
