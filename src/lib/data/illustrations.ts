/**
 * Maps a workflow step or lesson's title/description (plus its parent
 * workflow/course title, for context words a short step/lesson title alone
 * often lacks) to one of a set of on-brand illustrations
 * (public/illustrations/*.svg), by keyword. Keeps the global catalog
 * visually rich without depending on external images - every file is
 * self-hosted, so nothing here can 404 or drift off-brand.
 *
 * Order matters: the first matching pattern wins, so more specific
 * categories (a code diff, an AI triage/severity tag) are checked before
 * broader ones (a generic review checklist) that would otherwise claim the
 * same text via a more common word like "review".
 */
const KEYWORD_ILLUSTRATIONS: { pattern: RegExp; file: string }[] = [
  { pattern: /code review|pull request|\bpr\b|\bdiff\b|codebase/i, file: "code-review-diff" },
  { pattern: /classif|triage|severity|pre-?screen|scor(e|ing)|prioritiz|categoriz/i, file: "ai-triage-classify" },
  { pattern: /\breceived\b|inbound|\bopened\b|submitted|incoming|collected|\bintake\b|new (lead|application|request|ticket|signal)/i, file: "inbox-intake" },
  { pattern: /extract|scan|document|upload|pdf|ocr|form|pull|retriev|lookup/i, file: "document-scan" },
  // Negative lookahead excludes "Assisted" - nearly every workflow in this
  // catalog is titled "AI-Assisted ___", which would otherwise match every
  // single one of their steps here regardless of what the step is actually
  // about. "Assistant"/"assist"/"assisting" still match; "Assisted" doesn't.
  { pattern: /chat|assist(?!ed\b)|support|conversation|respond|inquir|answer|knowledge|procedure|\bsop\b/i, file: "chat-assist" },
  { pattern: /analy|report|dashboard|metric|forecast|trend|insight|research/i, file: "dashboard-chart" },
  { pattern: /email|draft|write|compose|message|proposal|copy|outreach|narrative|commentary/i, file: "email-draft" },
  { pattern: /review|check|approve|audit|qa|quality|verif|valid|finaliz/i, file: "checklist-review" },
  { pattern: /call|voice|transcri|meeting notes|summariz/i, file: "voice-transcribe" },
  { pattern: /schedule|calendar|book|plan|timeline|kickoff/i, file: "calendar-schedule" },
  { pattern: /risk|flag|fraud|alert|discrepanc|escalat|compliance|bias/i, file: "alert-flag" },
];

export function pickIllustration(text: string): string {
  const match = KEYWORD_ILLUSTRATIONS.find((k) => k.pattern.test(text));
  return `/illustrations/${match?.file ?? "ai-spark"}.svg`;
}
