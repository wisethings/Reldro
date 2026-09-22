import { cn } from "./cn";

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "blue";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-900",
  brand: "bg-orchid-soft text-orchid-deep",
  blue: "bg-orchid-soft text-orchid-deep",
  green: "bg-sage text-sage-deep",
  amber: "bg-olive-soft text-olive",
  red: "bg-coral-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
