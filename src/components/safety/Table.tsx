import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * A quiet data table: muted column labels, hairline row dividers, one link per row. On a phone each row
 * stacks (title first, the other cells as a wrapping line of chips) so nothing needs sideways scrolling.
 */
export function DataTable({ columns, template, children }: { columns: string[]; template: string; children: React.ReactNode }) {
  return (
    <div role="table" className="w-full min-w-0 overflow-hidden surface">
      <div role="row" className="hidden items-center gap-3 border-b border-l-2 border-b-ink-200 border-l-transparent bg-ink-100 px-4 py-2 text-xs font-medium text-ink-700 md:grid md:pr-9" style={{ gridTemplateColumns: template }}>
        {columns.map((c, i) => (
          <span key={i} role="columnheader" className="truncate">{c}</span>
        ))}
      </div>
      <div role="rowgroup" className="divide-y divide-ink-100">{children}</div>
    </div>
  );
}

/** `tone` gives a row a slim edge and a faint tint: urgent for things that cannot wait, warn for things that need someone. */
export function DataRow({ href, template, main, cells, chips, tone }: { href: string; template: string; main: React.ReactNode; cells: React.ReactNode[]; chips?: React.ReactNode; tone?: "urgent" | "warn" }) {
  return (
    <Link
      href={href}
      role="row"
      className={`group/row relative block border-l-2 px-4 py-2.5 outline-none ${tone === "urgent" ? "border-l-danger bg-coral-soft/25 hover:bg-coral-soft/60" : tone === "warn" ? "border-l-amber-deep/70 bg-amber-soft/20 hover:bg-amber-soft/40" : "border-l-transparent hover:bg-surface-hover"} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 md:grid md:items-center md:gap-3 md:py-2.5 md:pr-9`}
      style={{ gridTemplateColumns: template }}
    >
      <div className="min-w-0 md:col-start-1">{main}</div>
      {chips && <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">{chips}</div>}
      {cells.map((c, i) => (
        <div key={i} role="cell" className="hidden min-w-0 break-words text-sm text-ink-700 md:block">{c}</div>
      ))}
      <ChevronRight aria-hidden size={16} className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-ink-300 transition-colors group-hover/row:text-ink-600 md:block" />
    </Link>
  );
}
