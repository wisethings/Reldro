import { cn } from "./cn";

/**
 * Reldro brandmark: the two-leaf glyph and wordmark as one lockup (public/brand/logo-*.png), or the glyph alone.
 * `height` is the size the mark has always been given; the lockup is drawn a little smaller inside it because
 * its lettering is as tall as the glyph.
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
  const tone = inverse ? "bone" : "oxblood";

  return (
    <span className={cn("inline-flex items-center", className)} style={{ height }}>
      {iconOnly ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/glyph.png" alt="Reldro" style={{ height: "100%", width: "auto" }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/brand/logo-${tone}.png`} alt="Reldro" style={{ height: "80%", width: "auto" }} />
      )}
    </span>
  );
}
