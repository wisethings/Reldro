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
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset ring-black/5",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
