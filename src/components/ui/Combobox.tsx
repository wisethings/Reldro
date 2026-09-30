"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { controlClass } from "./controls";

export type ComboOption = { value: string; label: string; hint?: string };

type Props = {
  /** The searchable options (can be thousands: only the best matches are ever drawn). */
  options: ComboOption[];
  /** Always shown at the top, whatever is typed (for example "Anyone at the site" or "Nobody"). */
  pinned?: ComboOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** What the options are, for the empty state: "person", "site". */
  noun?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** field: a normal form control. toolbar: compact filter control. bare: borderless, for inline use in a joined control. */
  variant?: "field" | "toolbar" | "bare";
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

const MAX_SHOWN = 50;

/**
 * A searchable picker that scales: type to filter, arrow keys and Enter to choose, Escape to close. It never draws more than
 * 50 rows however many options there are, so it stays fast with thousands of people. On a phone it opens as a sheet at the top
 * of the screen, so the list stays in view above the on-screen keyboard.
 */
export function Combobox({ options, pinned = [], name, value, defaultValue = "", onChange, placeholder = "Choose…", searchPlaceholder, noun = "match", required, disabled, id, className = "", variant = "field", ...aria }: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ mobile: boolean; top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);
  const listId = useId();

  const byValue = useMemo(() => new Map([...pinned, ...options].map((o) => [o.value, o])), [options, pinned]);
  const haystacks = useMemo(() => options.map((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase()), [options]);
  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return { rows: options.slice(0, MAX_SHOWN), total: options.length };
    const starts: ComboOption[] = [];
    const rest: ComboOption[] = [];
    let total = 0;
    for (let i = 0; i < options.length; i++) {
      const h = haystacks[i];
      if (!terms.every((t) => h.includes(t))) continue;
      total++;
      if (starts.length + rest.length >= MAX_SHOWN * 2) continue;
      (options[i].label.toLowerCase().startsWith(terms[0]) ? starts : rest).push(options[i]);
    }
    return { rows: [...starts, ...rest].slice(0, MAX_SHOWN), total };
  }, [options, haystacks, query]);
  const rows = useMemo(() => [...pinned, ...results.rows], [pinned, results.rows]);

  useEffect(() => { if (!open) setPlace(null); }, [open]);

  const choose = useCallback((v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
    setQuery("");
    trigger.current?.focus({ preventScroll: true });
  }, [value, onChange]);

  const measure = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (window.matchMedia("(max-width: 639px)").matches) {
      setPlace({ mobile: true, left: 8, width: window.innerWidth - 16, maxHeight: Math.min(window.innerHeight * 0.55, 420) });
      return;
    }
    const width = Math.max(r.width, 288);
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - width - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 260 && above > below;
    setPlace(up ? { mobile: false, bottom: window.innerHeight - r.top + 4, left, width, maxHeight: Math.min(380, above) } : { mobile: false, top: r.bottom + 4, left, width, maxHeight: Math.min(380, Math.max(below, 180)) });
  }, []);

  useLayoutEffect(() => { if (open) measure(); }, [open, measure]);
  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || trigger.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, measure]);

  // The panel is invisible until it has been placed, and an invisible field cannot take focus, so focus once it is placed.
  const placed = place !== null;
  useEffect(() => {
    if (open && placed) searchBox.current?.focus({ preventScroll: true });
  }, [open, placed]);

  // Start on the current choice when opened; start over on the top result when typing.
  useEffect(() => {
    if (!open) return;
    const at = rows.findIndex((r) => r.value === current);
    setActive(query ? Math.min(pinned.length, rows.length - 1) : Math.max(at, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const selected = byValue.get(current);
  const label = selected && (current !== "" || pinned.some((p) => p.value === "")) ? selected.label : placeholder;
  const shape =
    variant === "bare" ? "flex w-full min-w-0 items-center justify-between gap-1 bg-transparent py-1 pl-2 pr-1 text-left text-base sm:text-xs text-ink-800 outline-none focus:bg-surface-muted disabled:opacity-60"
    : variant === "toolbar" ? "flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-ink-300 bg-white px-2.5 text-left text-base text-ink-800 outline-none hover:border-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 md:h-8 md:text-xs"
    : `${controlClass} flex items-center justify-between gap-2 text-left`;

  const panelStyle: React.CSSProperties | undefined = place
    ? place.mobile
      ? { top: "max(0.5rem, env(safe-area-inset-top))", left: place.left, width: place.width, maxHeight: place.maxHeight }
      : { top: place.top, bottom: place.bottom, left: place.left, width: place.width, maxHeight: place.maxHeight }
    : { visibility: "hidden" };

  return (
    <div className={`relative min-w-0 ${variant === "bare" ? "flex-1" : ""}`}>
      {name && <input type="hidden" name={name} value={current} />}
      {required && <input tabIndex={-1} aria-hidden required value={current} onChange={() => {}} className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />}
      <button
        ref={trigger}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        aria-invalid={aria["aria-invalid"]}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); } }}
        className={`${shape} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${current === "" && !pinned.some((p) => p.value === "") ? "text-ink-400" : ""}`}>{label}</span>
        <ChevronDown size={14} aria-hidden className="shrink-0 text-ink-500" />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div aria-hidden className="fixed inset-0 z-[69] bg-ink-900/30 sm:hidden" onClick={() => setOpen(false)} />
          <div
            ref={panel}
            style={panelStyle}
            className="fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-[0_12px_32px_-8px_rgba(42,10,12,0.28)] sm:rounded-lg"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-ink-100 px-3">
              <Search size={15} aria-hidden className="shrink-0 text-ink-400" />
              <input
                ref={searchBox}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={`${listId}-${active}`}
                aria-label={searchPlaceholder ?? `Search ${noun}s`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? `Search ${noun}s`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, rows.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  else if (e.key === "Home") { e.preventDefault(); setActive(0); }
                  else if (e.key === "End") { e.preventDefault(); setActive(rows.length - 1); }
                  else if (e.key === "Enter") { e.preventDefault(); if (rows[active]) choose(rows[active].value); }
                  else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus({ preventScroll: true }); }
                  else if (e.key === "Tab") setOpen(false);
                }}
                className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-400 sm:h-10 sm:text-sm"
              />
            </div>
            <ul ref={list} id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {rows.map((o, i) => {
                const isPinned = i < pinned.length;
                return (
                  <li
                    key={`${isPinned ? "p" : "o"}${o.value}`}
                    id={`${listId}-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={o.value === current}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(o.value)}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-1.5 text-base sm:min-h-9 sm:text-sm ${i === active ? "bg-surface-hover" : ""} ${isPinned && i === pinned.length - 1 ? "mb-1 border-b border-ink-100 pb-2" : ""}`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-orchid-deep">{o.value === current && <Check size={14} aria-hidden />}</span>
                    <span className={`min-w-0 truncate ${isPinned ? "font-medium text-ink-900" : "text-ink-900"}`}>{o.label}</span>
                    {o.hint && <span className="ml-auto max-w-[45%] shrink-0 truncate text-xs text-ink-500">{o.hint}</span>}
                  </li>
                );
              })}
              {results.rows.length === 0 && (
                <li role="presentation" className="px-3 py-4 text-center text-sm text-ink-500">
                  {query ? <>No {noun} matches “{query}”. <button type="button" onClick={() => setQuery("")} className="font-medium text-orchid-deep hover:text-oxblood">Clear search</button></> : `No ${noun}s to choose from.`}
                </li>
              )}
            </ul>
            {results.total > results.rows.length && (
              <p className="shrink-0 border-t border-ink-100 px-3 py-2 text-xs text-ink-500">
                Showing {results.rows.length} of {results.total.toLocaleString()}. Keep typing to narrow the list.
              </p>
            )}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
