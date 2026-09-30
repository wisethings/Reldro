import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** One page size for every list in the product (dense lists 15, card grids 12). */
export const PAGE_SIZE = 15;

/** Slices a list for the requested page, clamping to the last page so filters or deletions never leave someone on an empty page. */
export function paginate<T>(items: T[], rawPage: string | undefined, pageSize = PAGE_SIZE): { rows: T[]; page: number } {
  const page = Math.min(readPage(rawPage), Math.max(1, Math.ceil(items.length / pageSize)));
  return { rows: items.slice((page - 1) * pageSize, page * pageSize), page };
}

/** Reads `?page=` safely: a whole number of at least 1. */
export function readPage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

/** 1 … 4 5 [6] 7 8 … 20: always the first and last page, and a few around the current one. */
export function pageNumbers(current: number, last: number): (number | "gap")[] {
  const keep = new Set([1, last, current - 1, current, current + 1, current - 2 > 1 && current + 2 >= last ? current - 2 : 0, current + 2 < last && current - 2 <= 1 ? current + 2 : 0]);
  const list = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/**
 * Numbered pages for long lists (no endless scrolling). Every page is a plain link, so it works without scripts,
 * keeps the current filters, and can be bookmarked or shared.
 */
export function Pagination({ page, total, pageSize = PAGE_SIZE, hrefFor, noun = "results" }: { page: number; total: number; pageSize?: number; hrefFor: (page: number) => string; noun?: string }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total > 0 ? <p className="text-xs text-ink-500">{total} {total === 1 ? noun.replace(/s$/, "") : noun}</p> : null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const item = "flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium";
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-ink-500"><span className="font-medium tabular-nums text-ink-700">{from}–{to}</span> of {total} {noun}</p>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link scroll={false} href={hrefFor(page - 1)} className={`${item} gap-1 text-ink-700 hover:bg-ink-100`} aria-label="Previous page"><ChevronLeft size={14} aria-hidden /><span className="hidden sm:inline">Previous</span></Link>
          ) : (
            <span className={`${item} gap-1 text-ink-300`} aria-hidden><ChevronLeft size={14} /><span className="hidden sm:inline">Previous</span></span>
          )}
        </li>
        {pageNumbers(page, last).map((n, i) =>
          n === "gap" ? (
            <li key={`g${i}`} aria-hidden className="px-1 text-ink-400">…</li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={`${item} bg-ink-100 font-semibold text-ink-900`}>{n}</span>
              ) : (
                <Link scroll={false} href={hrefFor(n)} className={`${item} text-ink-700 hover:bg-ink-100`} aria-label={`Page ${n}`}>{n}</Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < last ? (
            <Link scroll={false} href={hrefFor(page + 1)} className={`${item} gap-1 text-ink-700 hover:bg-ink-100`} aria-label="Next page"><span className="hidden sm:inline">Next</span><ChevronRight size={14} aria-hidden /></Link>
          ) : (
            <span className={`${item} gap-1 text-ink-300`} aria-hidden><span className="hidden sm:inline">Next</span><ChevronRight size={14} /></span>
          )}
        </li>
      </ul>
    </nav>
  );
}
