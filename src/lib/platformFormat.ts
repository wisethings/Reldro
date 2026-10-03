/** "Never", "just now", "5 min ago", "3 hours ago", "12 days ago", then the date. Used for last-activity columns in the platform console. */
export function ago(d: Date | null | undefined, now: number = Date.now()): string {
  if (!d) return "Never";
  const mins = Math.max(0, Math.round((now - d.getTime()) / 60_000));
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "12 of 25 seats", "12 people" when no limit is set. */
export function seatsText(used: number, limit: number | null): string {
  return limit === null ? `${used} ${used === 1 ? "person" : "people"}` : `${used} of ${limit} seats`;
}

/** The same time as `ago`, written to sit inside a sentence: "just now", "3 days ago", "on Sep 3, 2026". */
export function agoInline(d: Date, now: number = Date.now()): string {
  const text = ago(d, now);
  return /\bago$|^Just now$/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : `on ${text}`;
}
