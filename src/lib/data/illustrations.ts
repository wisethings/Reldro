/**
 * Maps a workflow step or lesson's title/description to one of a small set
 * of on-brand illustrations (public/illustrations/*.svg), by keyword. Keeps
 * the global catalog visually rich without depending on external images -
 * every file is self-hosted, so nothing here can 404 or drift off-brand.
 */
const KEYWORD_ILLUSTRATIONS: { pattern: RegExp; file: string }[] = [
  { pattern: /extract|scan|document|upload|pdf|ocr|form|intake/i, file: "document-scan" },
  { pattern: /chat|assist|support|conversation|respond|inquir/i, file: "chat-assist" },
  { pattern: /analy|report|dashboard|metric|forecast|trend|insight/i, file: "dashboard-chart" },
  { pattern: /email|draft|write|compose|message|proposal|copy/i, file: "email-draft" },
  { pattern: /review|check|approve|audit|qa|quality|verify|validate/i, file: "checklist-review" },
  { pattern: /call|voice|transcri|meeting notes|summariz/i, file: "voice-transcribe" },
  { pattern: /schedule|calendar|book|plan|timeline|kickoff/i, file: "calendar-schedule" },
  { pattern: /risk|flag|fraud|alert|discrepanc|escalat|compliance/i, file: "alert-flag" },
];

export function pickIllustration(text: string): string {
  const match = KEYWORD_ILLUSTRATIONS.find((k) => k.pattern.test(text));
  return `/illustrations/${match?.file ?? "ai-spark"}.svg`;
}
