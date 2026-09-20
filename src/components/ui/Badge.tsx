import { cn } from "./cn";

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "blue";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
