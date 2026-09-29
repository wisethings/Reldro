import type { ReactNode } from "react";
import { cn } from "./cn";

export type IconBadgeTone = "orchid" | "olive" | "sage" | "coral";
type Tone = IconBadgeTone;

const toneClasses: Record<Tone, string> = {
  orchid: "bg-orchid-soft text-orchid-deep",
  olive: "bg-olive-soft text-olive",
  sage: "bg-sage text-sage-deep",
  coral: "bg-coral-soft text-oxblood",
};

/**
 * A colored icon chip for a card/section header - the small bit of visual
 * texture that turns a plain "Title + subtitle" header into something
 * scannable at a glance. Pass any 16-20px icon (lucide-react by
 * convention elsewhere in this app) as `icon`. Tones cycle through the
 * kit's existing accent colors rather than introducing new ones, so this
 * stays inside the established palette instead of picking arbitrary hexes
 * per page.
 */
export function IconBadge({ icon, tone = "orchid", className }: { icon: ReactNode; tone?: Tone; className?: string }) {
  return (
    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses[tone], className)}>
      {icon}
    </div>
  );
}
