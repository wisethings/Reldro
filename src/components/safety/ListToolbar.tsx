"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { AdaptiveSelect } from "@/components/ui/PersonSelect";

export type ToolbarSelect = { param: string; label: string; options: { value: string; label: string; hint?: string }[]; /** Always a searchable picker (people), even when short. */ search?: boolean; noun?: string };

/**
 * One quiet control bar for admin lists: a search box, a few filters and a sort, all kept in the URL so views can be
 * bookmarked and paginated. Changing anything returns to page 1. Only the params it owns are touched.
 */
export function ListToolbar({
  searchParam,
  placeholder,
  selects,
  sort,
  pageParam,
}: {
  searchParam: string;
  placeholder: string;
  selects: ToolbarSelect[];
  sort?: ToolbarSelect;
  pageParam: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get(searchParam) ?? "");
  const [busy, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const push = (over: Record<string, string>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, val] of Object.entries(over)) (val ? sp.set(k, val) : sp.delete(k));
    sp.delete(pageParam);
    startTransition(() => router.replace(`${path}?${sp.toString()}`, { scroll: false }));
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const owned = [searchParam, ...selects.map((s) => s.param)];
  const active = owned.some((k) => params.get(k));
  const clear = () => { setQ(""); push(Object.fromEntries(owned.map((k) => [k, ""]))); };
  const sel = "h-10 min-w-0 max-w-full flex-1 basis-[calc(50%-0.25rem)] rounded-lg sm:flex-none sm:basis-auto border border-ink-300 bg-white px-2 text-base md:h-8 md:text-xs text-ink-800 outline-none hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

  return (
    <div role="search" aria-busy={busy} className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
        <Search size={14} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <label className="sr-only" htmlFor={`tb-${searchParam}`}>{placeholder}</label>
        <input
          id={`tb-${searchParam}`}
          type="search"
          value={q}
          placeholder={placeholder}
          onChange={(e) => { setQ(e.target.value); clearTimeout(timer.current); const val = e.target.value; timer.current = setTimeout(() => push({ [searchParam]: val.trim() }), 250); }}
          className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-8 pr-2.5 text-base text-ink-900 md:h-8 md:flex-none md:basis-auto md:text-xs outline-none placeholder:text-ink-400 hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>
      {selects.map((s) => (
        <div key={s.param} className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
          <AdaptiveSelect variant="toolbar" aria-label={s.label} emptyLabel={s.label} noun={s.noun ?? "option"} alwaysSearch={s.search} options={s.options} value={params.get(s.param) ?? ""} onChange={(v) => push({ [s.param]: v })} className="w-full sm:w-auto sm:min-w-[9rem]" />
        </div>
      ))}
      <Spinner className={`text-xs text-ink-500 transition-opacity ${busy ? "opacity-100" : "opacity-0"}`} />
      {active && <button type="button" onClick={clear} className="text-xs font-medium text-orchid-deep hover:text-oxblood">Clear</button>}
      {sort && (
        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-600">
          Sort
          <select aria-label={sort.label} value={params.get(sort.param) ?? ""} onChange={(e) => push({ [sort.param]: e.target.value })} className={sel}>
            {sort.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
