import Link from "next/link";

/**
 * A quiet data table: muted column labels, hairline row dividers, one link per row. On a phone each row
 * stacks (title first, the other cells as a wrapping line of chips) so nothing needs sideways scrolling.
 */
export function DataTable({ columns, template, children }: { columns: string[]; template: string; children: React.ReactNode }) {
  return (
    <div role="table" className="overflow-hidden rounded-xl bg-white">
      <div role="row" className="hidden items-center gap-3 border-b border-ink-200/80 bg-ink-50/70 px-4 py-2 text-xs font-medium text-ink-500 md:grid" style={{ gridTemplateColumns: template }}>
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
      className={`block border-l-2 px-4 py-2.5 outline-none ${tone === "urgent" ? "border-l-danger bg-coral-soft/25 hover:bg-coral-soft/60" : tone === "warn" ? "border-l-amber-deep/70 bg-amber-soft/20 hover:bg-amber-soft/40" : "border-l-transparent hover:bg-surface-hover"} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 md:grid md:items-center md:gap-3 md:py-2`}
      style={{ gridTemplateColumns: template }}
    >
      <div className="min-w-0 md:col-start-1">{main}</div>
      {chips && <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">{chips}</div>}
      {cells.map((c, i) => (
        <div key={i} role="cell" className="hidden min-w-0 truncate text-sm text-ink-700 md:block">{c}</div>
      ))}
    </Link>
  );
}
