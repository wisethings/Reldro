import type { ReactNode } from "react";

/**
 * The one way to pin a form's primary action to the bottom of the screen on a phone.
 *
 * How it stays correct:
 *  - It is `sticky bottom-0` inside the page's scroll area, at the very end of the form. The scroll area already stops where
 *    the tab bar starts, so the bar sits directly above the tab bar, never under it, and the safe-area inset belongs to the
 *    tab bar (not guessed here).
 *  - Because it is the last thing in the form, scrolling to the end puts it in its natural place below the last field, so
 *    no field is ever permanently hidden and no extra bottom padding is needed.
 *  - Opaque background (never translucent) and a top border + soft shadow: content scrolls behind it without showing through.
 *  - From `sm` up it is an ordinary inline block.
 *
 * `bleed` is how far to extend sideways to reach the screen edges: the padding of whatever contains it, as negative margins
 * (for example "-mx-4" inside a `px-4` page). Put it in the same className as the matching `sm:mx-0`.
 */
export function MobileStickyActionBar({ children, bleed = "-mx-4", className = "" }: { children: ReactNode; bleed?: string; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 border-t border-ink-200 bg-white px-4 py-3 shadow-[0_-8px_16px_-10px_rgba(42,10,12,0.18)] ${bleed} sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none ${className}`}
    >
      {children}
    </div>
  );
}
