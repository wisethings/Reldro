"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { TrendPoint } from "@/lib/safety/metrics";

// The chart is drawn at its real pixel width (1 unit = 1px), so labels stay readable on a phone instead of shrinking with the box.
const H = 160, padL = 28, padB = 22, padT = 10;
const innerH = H - padB - padT;
const base = padT + innerH;

/** A bar with rounded top corners and a square bottom, so it sits flat on the baseline. */
function topRounded(x: number, y0: number, w: number, h: number): string {
  const r = Math.min(3, h, w / 2);
  const top = y0 - h;
  return `M${x},${y0} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${y0} Z`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Reports per week (or month), with the serious ones drawn on top so a rising trend of near misses reads differently from a
 * rising trend of injuries. Hover, touch or the arrow keys show the exact figures for a period; selecting one pins it and
 * offers a link to exactly those reports. The two legend items switch each series on and off.
 */
export function TrendChart({ points, periodLabel, siteId }: { points: TrendPoint[]; periodLabel: string; siteId?: string | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [show, setShow] = useState({ all: true, serious: true });
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setW(Math.max(240, Math.round(el.clientWidth)));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const innerW = W - padL;

  const n = points.length;
  const max = Math.max(1, ...points.map((p) => (show.all ? p.count : p.serious)));
  const slot = innerW / Math.max(1, n);
  const bar = Math.min(28, Math.max(6, slot * 0.62));
  const y = (v: number) => base - (v / max) * innerH;
  const every = Math.ceil(n / Math.max(2, Math.floor(innerW / 64)));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const active = hover ?? focus;
  const onlySerious = !show.all && show.serious;

  const indexAt = (e: PointerEvent) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    const i = Math.floor(((e.clientX - r.left) / r.width * W - padL) / slot);
    return i >= 0 && i < n ? i : null;
  };
  const toggle = (key: "all" | "serious") => setShow((s) => (s[key] && !s[key === "all" ? "serious" : "all"] ? s : { ...s, [key]: !s[key] }));
  const move = (to: number) => { setFocus(Math.max(0, Math.min(n - 1, to))); setHover(null); };
  const onKey = (e: KeyboardEvent) => {
    const cur = focus ?? n - 1;
    if (e.key === "ArrowLeft") { e.preventDefault(); move(cur - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); move(cur + 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(n - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned((p) => (p === cur ? null : cur)); }
    else if (e.key === "Escape") setPinned(null);
  };

  const hrefFor = (p: TrendPoint) => {
    const q = new URLSearchParams({ status: "all", from: p.from, to: p.to });
    if (siteId) q.set("site", siteId);
    if (onlySerious) q.set("severity", "HIGH,CRITICAL");
    return `/dashboard/reports?${q.toString()}`;
  };
  const countOf = (p: TrendPoint) => (onlySerious ? p.serious : p.count);
  const describe = (p: TrendPoint) => `${p.range}: ${plural(p.count, "report", "reports")}, ${p.serious} serious or life-threatening`;

  const tip = active !== null ? points[active] : null;
  const prev = active !== null && active > 0 ? points[active - 1] : null;
  const cx = active !== null ? ((padL + active * slot + slot / 2) / W) * 100 : 0;
  const pin = pinned !== null ? points[pinned] : null;

  return (
    <figure>
      <div
        role="group"
        tabIndex={0}
        aria-label={`Reports ${periodLabel}. Use the left and right arrow keys to move between periods, and Enter to select one.`}
        ref={box}
        onKeyDown={onKey}
        onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setFocus((f) => f ?? n - 1); }}
        onBlur={() => setFocus(null)}
        className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={`Reports ${periodLabel}. ${points.map((p) => `${p.range}: ${p.count}`).join(", ")}`}
          className="block max-w-full cursor-pointer touch-pan-y"
          onPointerMove={(e) => setHover(indexAt(e))}
          onPointerDown={(e) => setHover(indexAt(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => { const i = indexAt(e as unknown as PointerEvent); if (i !== null) setPinned((p) => (p === i ? null : i)); }}
        >
          {pinned !== null && <rect x={padL + pinned * slot} y={padT} width={slot} height={innerH} rx={3} className="fill-orchid-soft" />}
          {active !== null && active !== pinned && <rect x={padL + active * slot} y={padT} width={slot} height={innerH} rx={3} className="fill-ink-100" />}
          {ticks.filter((t) => t !== 0).map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-ink-100" strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="fill-ink-500 text-[11px]">{t}</text>
            </g>
          ))}
          <text x={padL - 6} y={base + 3} textAnchor="end" className="fill-ink-500 text-[11px]">0</text>
          {points.map((p, i) => {
            const x = padL + i * slot + (slot - bar) / 2;
            const h = show.all ? Math.max(p.count > 0 ? 2 : 0, base - y(p.count)) : 0;
            const hs = show.serious ? Math.max(p.serious > 0 ? 2 : 0, base - y(p.serious)) : 0;
            const dim = (active !== null || pinned !== null) && i !== active && i !== pinned;
            return (
              <g key={i} opacity={dim ? 0.45 : 1}>
                {h > 0 && <path d={topRounded(x, base, bar, h)} className="fill-orchid-deep/45" />}
                {hs > 0 && <path d={topRounded(x, base, bar, hs)} className="fill-danger" />}
                {(n - 1 - i) % every === 0 && (x + bar / 2 > W - 22
                  ? <text x={W} y={H - 6} textAnchor="end" className="fill-ink-500 text-[11px]">{p.label}</text>
                  : <text x={x + bar / 2} y={H - 6} textAnchor="middle" className="fill-ink-500 text-[11px]">{p.label}</text>)}
              </g>
            );
          })}
          {/* The baseline is drawn last and the bars end exactly on it, so every bar sits flush on the line. */}
          <line x1={padL} x2={W} y1={base} y2={base} className="stroke-ink-300" strokeWidth={1} />
        </svg>

        {tip && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-8px_rgba(42,10,12,0.3)]"
            style={cx < 50 ? { left: `calc(${cx}% + 14px)` } : { right: `calc(${100 - cx}% + 14px)` }}
          >
            <p className="font-medium text-ink-600">{tip.range}</p>
            <p className="mt-1 flex items-center gap-2"><span className="h-0.5 w-3 shrink-0 rounded bg-orchid-deep/45" /><span className="text-base font-semibold tabular-nums text-ink-900">{tip.count}</span><span className="text-ink-600">{tip.count === 1 ? "report" : "reports"}</span></p>
            <p className="mt-0.5 flex items-center gap-2"><span className="h-0.5 w-3 shrink-0 rounded bg-danger" /><span className="text-base font-semibold tabular-nums text-ink-900">{tip.serious}</span><span className="min-w-0 text-ink-600">serious or worse</span></p>
            {prev && (
              <p className="mt-1.5 border-t border-ink-100 pt-1.5 text-ink-500">
                {tip.count === prev.count ? "Same as the period before" : `${tip.count > prev.count ? "Up" : "Down"} ${Math.abs(tip.count - prev.count)} from the period before`}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-700">
        <button type="button" aria-pressed={show.all} onClick={() => toggle("all")} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 hover:bg-surface-hover">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${show.all ? "bg-orchid-deep/45" : "border border-ink-300"}`} />
          <span className={show.all ? "" : "text-ink-500 line-through"}>All reports</span>
        </button>
        <button type="button" aria-pressed={show.serious} onClick={() => toggle("serious")} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 hover:bg-surface-hover">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${show.serious ? "bg-danger" : "border border-ink-300"}`} />
          <span className={show.serious ? "" : "text-ink-500 line-through"}>Serious or life-threatening</span>
        </button>
      </div>

      <div className="mt-1 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 pt-2 text-xs" aria-live="polite">
        {pin ? (
          <>
            <p className="min-w-0 text-ink-700"><span className="font-semibold text-ink-900">{pin.range}</span> · {plural(pin.count, "report", "reports")} · {pin.serious} serious or worse</p>
            {countOf(pin) > 0 ? (
              <Link href={hrefFor(pin)} className="font-medium text-orchid-deep hover:text-oxblood">Open {onlySerious ? plural(pin.serious, "serious report", "serious reports") : plural(pin.count, "report", "reports")} →</Link>
            ) : <span className="text-ink-500">No reports to open</span>}
            <button type="button" onClick={() => setPinned(null)} aria-label="Clear selection" className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-500 hover:bg-surface-hover hover:text-ink-800"><X size={14} aria-hidden /></button>
          </>
        ) : (
          <p className="text-ink-500">{tip ? describe(tip) : "Select a bar to see its figures and open those reports."}</p>
        )}
      </div>

      <table className="sr-only">
        <caption>Reports {periodLabel}</caption>
        <thead><tr><th>Period</th><th>Reports</th><th>Serious or worse</th></tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{p.range}</td><td>{p.count}</td><td>{p.serious}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
