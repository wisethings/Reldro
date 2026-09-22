import { cn } from "./cn";

/** Reldro wordmark: live text in Parkinsans 480 uppercase, per the Reldro UI kit. */
export function Logo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "font-wordmark text-lg uppercase",
        inverse ? "text-bone" : "text-oxblood",
        className
      )}
    >
      Reldro
    </span>
  );
}
