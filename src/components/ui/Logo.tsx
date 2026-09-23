import { cn } from "./cn";

/**
 * Real Reldro brandmark: the dotted open-book glyph + the vector wordmark,
 * pulled directly from the Reldro UI kit's asset files (not re-created).
 */
export function Logo({
  inverse = false,
  iconOnly = false,
  height = 24,
  className,
}: {
  inverse?: boolean;
  iconOnly?: boolean;
  height?: number;
  className?: string;
}) {
  const glyph = inverse ? "/brand/glyph-bone.svg" : "/brand/glyph-oxblood.svg";
  const wordmark = inverse ? "/brand/wordmark-bone.svg" : "/brand/wordmark-oxblood.svg";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={glyph} alt={iconOnly ? "Reldro" : ""} style={{ height: "100%", width: "auto" }} />
      {!iconOnly && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={wordmark} alt="Reldro" style={{ height: "62%", width: "auto" }} />
      )}
    </span>
  );
}
