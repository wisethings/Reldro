import { cn } from "./cn";

type Tone = "neutral" | "brand" | "green" | "amber" | "gold" | "red" | "blue" | "sky" | "teal" | "indigo";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-900",
  brand: "bg-orchid-soft text-orchid-deep",
  blue: "bg-sky-soft text-sky-deep",
  sky: "bg-sky-soft text-sky-deep",
  teal: "bg-teal-soft text-teal-deep",
  indigo: "bg-indigo-soft text-indigo-deep",
  gold: "bg-gold-soft text-gold-deep",
  green: "bg-sage text-sage-deep",
  amber: "bg-amber-soft text-amber-deep",
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
