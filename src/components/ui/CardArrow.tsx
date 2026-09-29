import { ChevronRight } from "lucide-react";
import { cn } from "./cn";

/**
 * A decorative "this whole row/card is clickable" affordance - the row
 * itself is already wrapped in the real <Link>, so this is a plain span
 * rather than its own link (an anchor can't nest inside another anchor).
 */
export function CardArrow({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orchid-soft text-orchid-deep", className)}>
      <ChevronRight size={18} />
    </span>
  );
}
