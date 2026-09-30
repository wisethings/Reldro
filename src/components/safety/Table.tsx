import Link from "next/link";

/**
 * A quiet data table: muted column labels, hairline row dividers, one link per row. On a phone each row
 * stacks (title first, the other cells as a wrapping line of chips) so nothing needs sideways scrolling.
 */
export function DataTable({ columns, template, children }: { columns: string[]; template: string; children: React.ReactNode }) {
  return (
    <div role="table" className="overflow-hidden rounded-xl border border-ink-200/80 bg-white">
      <div role="row" className="hidden items-center gap-3 border-b border-ink-200/80 bg-ink-50/70 px-4 py-2 text-xs font-medium text-ink-500 md:grid" style={{ gridTemplateColumns: template }}>
        {columns.map((c, i) => (
          <span key={i} role="columnheader" className="truncate">{c}</span>
        ))}
      </div>
      <div role="rowgroup" className="divide-y divide-ink-100">{children}</div>
    </div>
  );
}

export function DataRow({ href, template, main, cells, chips }: { href: string; template: string; main: React.ReactNode; cells: React.ReactNode[]; chips?: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="row"
      className="block px-4 py-2.5 outline-none hover:bg-ink-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 md:grid md:items-center md:gap-3 md:py-2"
      style={{ gridTemplateColumns: template }}
    >
      <div className="min-w-0 md:col-start-1">{main}</div>
      {chips && <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">{chips}</div>}
      {cells.map((c, i) => (
        <div key={i} role="cell" className="hidden min-w-0 truncate text-[13px] text-ink-700 md:block">{c}</div>
      ))}
    </Link>
  );
}
