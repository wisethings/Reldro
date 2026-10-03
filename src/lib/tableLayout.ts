/**
 * The table switches from stacked rows to columns only once the columns genuinely fit. The fixed-width columns, the gaps, the row
 * padding and the app chrome (sidebar and page padding) are added up, and the smallest screen width that leaves the title column
 * at least ~170px decides the breakpoint. Below it, rows stack, so a column never overlaps another or gets cut off.
 */
const CHROME_PX = 224 + 48 + 8 + 68; // sidebar, page padding, panel gap, row padding and chevron room
const FLEX_MIN_PX = 170;
const BREAKPOINTS = [["md", 768], ["lg", 1024], ["xl", 1280], ["2xl", 1536]] as const;
export type Bp = (typeof BREAKPOINTS)[number][0];

export function tableBreakpoint(template: string): Bp {
  const tracks = template.trim().split(/\s+/);
  const px = tracks.reduce((sum, t) => {
    const rem = t.match(/(\d+(?:\.\d+)?)rem/);
    return sum + (rem ? Number(rem[1]) * 16 : FLEX_MIN_PX);
  }, 0);
  const need = px + (tracks.length - 1) * 12 + CHROME_PX;
  return (BREAKPOINTS.find(([, w]) => need <= w) ?? BREAKPOINTS[BREAKPOINTS.length - 1])[0];
}

