/**
 * One definition of "overdue" for the whole product. Due dates and expiry dates are days, not moments: something due on
 * the 3rd is still on time all through the 3rd, and only overdue from the 4th. Days are counted in UTC, which is how
 * date-only values are stored, so every page, count, email and filter agrees.
 */
const DAY = 86_400_000;

export const startOfDayUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
export const startOfTodayUTC = (now: Date = new Date()) => startOfDayUTC(now);

/** True once the whole due day has passed. */
export const isOverdue = (due: Date | null | undefined, now: Date = new Date()): boolean => Boolean(due && due.getTime() < startOfTodayUTC(now).getTime());

/** Whole calendar days from today to the date: 0 today, 3 in three days, -2 two days ago. */
export const daysUntil = (due: Date, now: Date = new Date()): number => Math.round((startOfDayUTC(due).getTime() - startOfTodayUTC(now).getTime()) / DAY);

/** The start of the day `days` from today, for "within the next N days" queries (use with `lt`). */
export const dayStartIn = (days: number, now: Date = new Date()): Date => new Date(startOfTodayUTC(now).getTime() + days * DAY);

/** Qualification state from its expiry day: expired once the day has passed, "soon" within the next 30 days. */
export const qualStatus = (expiresOn: Date | null | undefined, now: Date = new Date()): "expired" | "soon" | "current" =>
  !expiresOn ? "current" : isOverdue(expiresOn, now) ? "expired" : expiresOn.getTime() < dayStartIn(31, now).getTime() ? "soon" : "current";
