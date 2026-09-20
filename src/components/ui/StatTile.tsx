import { cn } from "./cn";

export function StatTile({
  label,
  value,
  helpText,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  helpText?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-ink-200 bg-white p-4 shadow-card", className)}>
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink-900 tabular-nums">{value}</span>
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-600")}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      {helpText && <p className="mt-1 text-xs text-ink-500">{helpText}</p>}
    </div>
  );
}
