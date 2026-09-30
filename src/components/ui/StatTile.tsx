import { cn } from "./cn";

export function StatTile({
  label,
  value,
  helpText,
  trend,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  helpText?: string;
  trend?: { value: string; positive: boolean };
  /** An <IconBadge> (or any node) shown left of the label. */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-ink-200 bg-white p-4", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-medium text-ink-500">{label}</p>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-ink-900 tabular-nums">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive ? "text-sage-deep" : "text-danger")}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-ink-500">{helpText}</p>}
    </div>
  );
}
