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
    brand: "bg-brand-600",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  } as const;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div className={cn("h-full rounded-full", toneClasses[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ScoreRing({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const color = value >= 70 ? "#1a9c6b" : value >= 45 ? "#3552a8" : "#c7841f";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#eceef1" strokeWidth={stroke} fill="none" />
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
