/** Common repeat intervals for checklists. Stored as a number of days, so any other interval still works as "Custom". */
export const REPEATS = [
  { days: 1, label: "Every day" },
  { days: 7, label: "Every week" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Every month" },
  { days: 90, label: "Every 3 months" },
] as const;

export const repeatLabel = (days: number | null) => (!days ? null : REPEATS.find((r) => r.days === days)?.label ?? `Every ${days} days`);
