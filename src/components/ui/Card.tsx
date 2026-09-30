import { cn } from "./cn";

/**
 * `tone="plain"` is a white panel with no outline, for use on a grey page (Settings) where the background already separates it.
 * `tone="muted"` is for secondary panels (context beside the main work, notes, summaries): a faint warm-grey
 * fill with no border, so it separates from the white content by contrast instead of by an outline.
 */
export function Card({ className, id, tone = "default", children }: { className?: string; id?: string; tone?: "default" | "muted" | "plain"; children: React.ReactNode }) {
  return (
    <div id={id} className={cn(tone === "muted" ? "rounded-xl bg-surface-muted [&>div:first-child]:border-ink-200/40" : tone === "plain" ? "rounded-xl bg-white [&>div:first-child]:border-ink-100" : "rounded-xl border border-ink-200/80 bg-white", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** An <IconBadge> (or any node) shown left of the title - see components/ui/IconBadge.tsx. */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-ink-200/80 px-4 py-3", className)}>
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
