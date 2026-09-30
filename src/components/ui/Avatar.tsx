import { cn } from "./cn";

const PALETTE = ["bg-orchid-soft text-orchid-deep", "bg-olive-soft text-olive", "bg-sage text-sage-deep", "bg-coral-soft text-oxblood"];

/** Deterministic (not random) so the same name always gets the same color across renders/pages. */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

/** An initials circle for a person's name, used wherever a small headshot-style marker is useful (an owner, an assignee) but we have no actual photo to show. */
export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const tone = PALETTE[hashName(name) % PALETTE.length];

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full text-xs font-semibold", tone, className)}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
