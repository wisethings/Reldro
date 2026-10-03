import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { tableBreakpoint, type Bp } from "@/lib/tableLayout";

// Tailwind only generates classes it can see written out, so every breakpoint's classes are spelled out here.
const CLS: Record<Bp, { head: string; row: string; col: string; chips: string; cell: string; chev: string }> = {
  md: { head: "md:grid md:pr-9", row: "md:grid md:items-center md:gap-3 md:py-2.5 md:pr-9", col: "md:col-start-1", chips: "md:hidden", cell: "md:block", chev: "md:block" },
  lg: { head: "lg:grid lg:pr-9", row: "lg:grid lg:items-center lg:gap-3 lg:py-2.5 lg:pr-9", col: "lg:col-start-1", chips: "lg:hidden", cell: "lg:block", chev: "lg:block" },
  xl: { head: "xl:grid xl:pr-9", row: "xl:grid xl:items-center xl:gap-3 xl:py-2.5 xl:pr-9", col: "xl:col-start-1", chips: "xl:hidden", cell: "xl:block", chev: "xl:block" },
  "2xl": { head: "2xl:grid 2xl:pr-9", row: "2xl:grid 2xl:items-center 2xl:gap-3 2xl:py-2.5 2xl:pr-9", col: "2xl:col-start-1", chips: "2xl:hidden", cell: "2xl:block", chev: "2xl:block" },
};

/**
 * A quiet data table: muted column labels, hairline row dividers, one link per row. On a phone each row
 * stacks (title first, the other cells as a wrapping line of chips) so nothing needs sideways scrolling.
 */
export function DataTable({ columns, template, children }: { columns: string[]; template: string; children: React.ReactNode }) {
  return (
    <div role="table" className="w-full min-w-0 overflow-hidden surface">
      <div role="row" className={`hidden items-center gap-3 border-b border-l-2 border-b-ink-200 border-l-transparent bg-ink-100 px-4 py-2 text-xs font-medium text-ink-700 ${CLS[tableBreakpoint(template)].head}`} style={{ gridTemplateColumns: template }}>
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
  const bp = CLS[tableBreakpoint(template)];
  return (
    <Link
      href={href}
      role="row"
      className={`group/row relative block border-l-2 px-4 py-2.5 outline-none ${tone === "urgent" ? "border-l-danger bg-coral-soft/25 hover:bg-coral-soft/60" : tone === "warn" ? "border-l-amber-deep/70 bg-amber-soft/20 hover:bg-amber-soft/40" : "border-l-transparent hover:bg-surface-hover"} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${bp.row}`}
      style={{ gridTemplateColumns: template }}
    >
      <div className={`min-w-0 ${bp.col}`}>{main}</div>
      {chips && <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 ${bp.chips}`}>{chips}</div>}
      {cells.map((c, i) => (
        <div key={i} role="cell" className={`hidden min-w-0 break-words text-sm text-ink-700 ${bp.cell}`}>{c}</div>
      ))}
      <ChevronRight aria-hidden size={16} className={`absolute right-3 top-1/2 hidden -translate-y-1/2 text-ink-300 transition-colors group-hover/row:text-ink-600 ${bp.chev}`} />
    </Link>
  );
}
