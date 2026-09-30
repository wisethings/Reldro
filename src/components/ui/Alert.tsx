import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "./cn";

/**
 * Inline message. The hue says what kind of message it is, so two different messages never look alike:
 * red = something failed, amber = a caution or something to check, blue = information, green = done.
 */
type AlertTone = "error" | "warning" | "info" | "success";

const STYLE: Record<AlertTone, { box: string; Icon: typeof Info }> = {
  error: { box: "border-coral/50 bg-coral-soft text-danger", Icon: CircleAlert },
  warning: { box: "border-amber-deep/25 bg-amber-soft text-amber-deep", Icon: TriangleAlert },
  info: { box: "border-sky-deep/20 bg-sky-soft text-sky-deep", Icon: Info },
  success: { box: "border-sage-deep/20 bg-sage text-sage-deep", Icon: CheckCircle2 },
};

export function Alert({ tone = "info", className, children }: { tone?: AlertTone; className?: string; children: React.ReactNode }) {
  const { box, Icon } = STYLE[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-snug", box, className)}>
      <Icon size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
