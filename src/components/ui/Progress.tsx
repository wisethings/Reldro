import { cn } from "./cn";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "brand",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClasses = {
    brand: "bg-orchid-deep",
    green: "bg-sage-deep",
    amber: "bg-olive",
    red: "bg-danger",
  } as const;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken", className)}>
      <div className={cn("h-full rounded-full", toneClasses[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * A progress bar with labeled checkpoints along it (e.g. reward tiers a
 * points balance is climbing toward), instead of a bare percentage. Each
 * milestone before the current value renders filled; the rest are hollow.
 * `milestones` must be sorted ascending by `value` - the last one sets the
 * bar's own max.
 */
export function MilestoneProgressBar({
  value,
  milestones,
  className,
}: {
  value: number;
  milestones: { value: number; label: string }[];
  className?: string;
}) {
  const max = milestones[milestones.length - 1]?.value || 1;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full rounded-full bg-orchid-deep" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between">
        {milestones.map((m) => (
          <div key={m.value} className="flex flex-col items-center gap-1 text-center">
            <span className={cn("h-2 w-2 rounded-full", value >= m.value ? "bg-orchid-deep" : "bg-ink-200")} />
            <span className="text-[11px] font-medium text-ink-700">{m.value} pts</span>
            <span className="text-[10px] text-ink-400">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreRing({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const color = value >= 70 ? "#3D5A3A" : value >= 45 ? "#8A4A7E" : "#755F2F";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E6E1D3" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold text-ink-900">{value}</span>
        {label && <span className="text-[10px] text-ink-500">{label}</span>}
      </div>
    </div>
  );
}
