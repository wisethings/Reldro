"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type Opt = { value: string; label: string };

/**
 * One toolbar for everything that narrows the Reports table: status, seriousness, site and search. The state lives in the
 * address bar, so a filtered view can be bookmarked, and changing any filter returns to page 1.
 */
export function ReportFilters({ statuses, severities, sites, showSeverity }: { statuses: Opt[]; severities: Opt[]; sites: Opt[]; showSeverity: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const get = (k: string) => sp.get(k) ?? "";
  const [q, setQ] = useState(get("q"));
  const first = useRef(true);
  const [busy, startTransition] = useTransition();

  const go = (over: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, val] of Object.entries(over)) (val ? next.set(k, val) : next.delete(k));
    next.delete("page");
    const s = next.toString();
    startTransition(() => router.replace(s ? `${path}?${s}` : path, { scroll: false }));
  };

  // Search as you type, after a short pause.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (q === get("q")) return;
    const t = setTimeout(() => go({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = get("status") || "open";
  const attention = get("attention");
  const active = Boolean(get("severity") || get("site") || get("q") || attention);
  const select = "h-10 w-full min-w-0 rounded-lg border border-ink-200 bg-white px-2.5 text-base md:h-8 md:w-auto md:text-xs text-ink-800 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div role="search" aria-busy={busy} className={`flex w-full sm:w-fit max-w-full flex-wrap items-center gap-2 surface p-1.5 transition-opacity ${busy ? "opacity-80" : ""}`}>
      <div role="group" aria-label="Status" className="seg-group">
        {statuses.map((s) => (
          <button key={s.value} type="button" onClick={() => go({ status: s.value, attention: "" })} aria-pressed={status === s.value && !attention} className={`seg ${status === s.value && !attention ? "seg-on" : "seg-off"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <label className="relative min-w-[10rem] flex-1 sm:max-w-xs">
        <span className="sr-only">Search reports</span>
        <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search title or details" className="h-8 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-2.5 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
      </label>

      {showSeverity && (
        <label className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
          <span className="sr-only">Seriousness</span>
          <select value={get("severity")} onChange={(e) => go({ severity: e.target.value })} className={select}>
            <option value="">Any seriousness</option>
            {severities.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      )}
      {sites.length > 0 && (
        <label className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
          <span className="sr-only">Site</span>
          <select value={get("site")} onChange={(e) => go({ site: e.target.value })} className={select}>
            <option value="">All sites</option>
            {sites.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
      )}
      {active && (
        <button type="button" onClick={() => { setQ(""); go({ severity: "", site: "", q: "", attention: "" }); }} className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-orchid-deep hover:bg-orchid-soft/60">
          <X size={13} aria-hidden /> Clear filters
        </button>
      )}
    </div>
  );
}
