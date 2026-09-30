import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function Queue({
  title,
  count,
  href,
  hrefLabel = "View all",
  tone = "neutral",
  empty,
  children,
}: {
  title: string;
  count: number;
  href?: string;
  hrefLabel?: string;
  tone?: "neutral" | "alert";
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <Card tone="plain" className={tone === "alert" && count > 0 ? "ring-1 ring-coral/60" : ""}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${count > 0 && tone === "alert" ? "bg-coral-soft text-danger" : "bg-surface-sunken text-ink-700"}`}>{count}</span>
        </div>
        {href && count > 0 && <Link href={href} className="text-xs font-medium text-orchid-deep hover:text-oxblood">{hrefLabel} →</Link>}
      </div>
      {count === 0 ? <p className="px-4 py-4 text-sm text-ink-500 sm:px-5">{empty}</p> : <ul className="divide-y divide-ink-100">{children}</ul>}
    </Card>
  );
}

export function QueueRow({ href, title, meta, right }: { href: string; title: string; meta?: string; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-hover sm:px-5">
        <div className="min-w-0">
          <p title={title} className="line-clamp-2 break-words text-sm font-medium text-ink-900">{title}</p>
          {meta && <p title={meta} className="line-clamp-2 break-words text-xs text-ink-500">{meta}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </Link>
    </li>
  );
}
