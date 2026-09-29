import type { ComponentType } from "react";
import { Code2, Tags, Inbox, FileSearch, MessageCircle, BarChart3, Mail, CheckSquare, Mic, Calendar, AlertTriangle, FileText } from "lucide-react";

/**
 * The same keyword categories as pickIllustration (lib/data/illustrations.ts),
 * mapped to a small lucide icon instead of a full illustration graphic - for
 * compact card icon badges (workflow/opportunity/template cards) rather than
 * the step-level illustrations those render inline. Order matters the same
 * way: first match wins, most specific categories checked first.
 */
const KEYWORD_ICONS: { pattern: RegExp; Icon: ComponentType<{ size?: number }> }[] = [
  { pattern: /code review|pull request|\bpr\b|\bdiff\b|codebase/i, Icon: Code2 },
  { pattern: /classif|triage|severity|pre-?screen|scor(e|ing)|prioritiz|categoriz/i, Icon: Tags },
  { pattern: /\breceived\b|inbound|\bopened\b|submitted|incoming|collected|\bintake\b|new (lead|application|request|ticket|signal)/i, Icon: Inbox },
  { pattern: /extract|scan|document|upload|pdf|ocr|form|pull|retriev|lookup/i, Icon: FileSearch },
  { pattern: /chat|assist(?!ed\b)|support|conversation|respond|inquir|answer|knowledge|procedure|\bsop\b/i, Icon: MessageCircle },
  { pattern: /analy|report|dashboard|metric|forecast|trend|insight|research/i, Icon: BarChart3 },
  { pattern: /email|draft|write|compose|message|proposal|copy|outreach|narrative|commentary/i, Icon: Mail },
  { pattern: /review|check|approve|audit|qa|quality|verif|valid|finaliz/i, Icon: CheckSquare },
  { pattern: /call|voice|transcri|meeting notes|summariz/i, Icon: Mic },
  { pattern: /schedule|calendar|book|plan|timeline|kickoff/i, Icon: Calendar },
  { pattern: /risk|flag|fraud|alert|discrepanc|escalat|compliance|bias/i, Icon: AlertTriangle },
];

export function getCategoryIcon(text: string): ComponentType<{ size?: number }> {
  return KEYWORD_ICONS.find((k) => k.pattern.test(text))?.Icon ?? FileText;
}
