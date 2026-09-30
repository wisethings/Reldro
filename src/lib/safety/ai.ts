import "server-only";
import { getAIProvider } from "@/lib/ai/provider";
import { SafetyPack, SEVERITY_ORDER, type SeverityKey } from "./pack";

/**
 * AI assistance for safety paperwork. Rules for everything in this file:
 *  - Output is a DRAFT for a person to edit, approve or discard.
 *  - It may restructure what people wrote; it must not invent facts,
 *    assign fault, name a root cause, or say a site is safe/compliant.
 *  - `generatedBy` says whether a language model or the built-in
 *    checklists produced it, so the UI can be honest about that.
 *  - Without a configured model provider every function still works from
 *    deterministic rules.
 */

export type Generated = "model" | "rules";

const SAFE_SYSTEM = [
  "You help safety staff with paperwork. You produce drafts that a person will review.",
  "Use only the facts provided. Never invent details, names, times or causes.",
  "Never assign blame or fault to a person. Never state a final root cause.",
  "Never say a workplace is safe or compliant with any regulation.",
  "If information is missing, say what is missing instead of guessing.",
].join(" ");

function modelAvailable() {
  return getAIProvider().name !== "mock";
}

async function askModel(prompt: string): Promise<string | null> {
  if (!modelAvailable()) return null;
  try {
    return await getAIProvider().generateText(prompt, SAFE_SYSTEM);
  } catch {
    return null;
  }
}

function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Report structuring (voice note / free text -> structured draft)
// ---------------------------------------------------------------------------

export type ReportDraft = {
  type: string;
  category: string;
  severity: SeverityKey;
  title: string;
  description: string;
  immediateAction: string;
  injuryInvolved: boolean;
  missing: string[];
  generatedBy: Generated;
};

function firstSentence(text: string, max = 80) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  return sentence.length > max ? sentence.slice(0, max - 1).trimEnd() + "…" : sentence;
}

export function missingReportInfo(text: string, injuryInvolved: boolean, hasSite: boolean): string[] {
  const t = text.toLowerCase();
  const missing: string[] = [];
  if (!hasSite && !/(level|floor|room|area|building|panel|roof|basement|shop|yard|site)/.test(t)) missing.push("Where exactly did this happen (area, floor or room)?");
  if (text.trim().split(/\s+/).length < 8) missing.push("A little more detail on what happened.");
  if (injuryInvolved && !/(first aid|treated|hospital|clinic|ambulance|sent home|bandage|ice)/.test(t)) missing.push("Was first aid or medical care given?");
  if (!/(was doing|working on|while|during|installing|pulling|running|cutting|using)/.test(t)) missing.push("What task was being done at the time?");
  return missing;
}

function structureByRules(text: string, pack: SafetyPack): ReportDraft {
  const t = ` ${text.toLowerCase()} `;
  let best = { key: "OTHER", score: 0 };
  for (const c of pack.categories) {
    const score = c.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (score > best.score) best = { key: c.key, score };
  }
  const hurt = /(hurt|injur|cut myself|bleed|sprain|burn|shock|hit (his|her|my|him|me)|fell|pain|strain|bruis)/.test(t);
  const nearMiss = /(almost|nearly|close call|near miss|could have|narrowly|missed (him|her|me))/.test(t);
  const equipment = /(broken|damaged|missing|frayed|cracked|faulty|guard (is )?off|not working)/.test(t);
  const type = hurt && !nearMiss ? "INJURY" : nearMiss ? "NEAR_MISS" : equipment ? "EQUIPMENT" : /(unsafe|hazard|exposed|unprotected|no (guard|harness|railing))/.test(t) ? "HAZARD" : "CONCERN";
  let severity: SeverityKey = "LOW";
  if (type === "INJURY" || type === "HAZARD" || type === "NEAR_MISS") severity = "MEDIUM";
  if (pack.severityKeywords.HIGH.some((k) => t.includes(k))) severity = "HIGH";
  if (pack.severityKeywords.CRITICAL.some((k) => t.includes(k))) severity = "CRITICAL";
  const injuryInvolved = type === "INJURY";
  return {
    type,
    category: best.key,
    severity,
    title: firstSentence(text),
    description: text.trim(),
    immediateAction: "",
    injuryInvolved,
    missing: missingReportInfo(text, injuryInvolved, false),
    generatedBy: "rules",
  };
}

export async function structureReportDraft(text: string, pack: SafetyPack): Promise<ReportDraft> {
  const clean = text.trim().slice(0, 4000);
  const fallback = structureByRules(clean, pack);
  const raw = await askModel(
    `Turn this worker's note into a structured safety report draft. Respond with ONLY JSON: ` +
      `{"type":"HAZARD|NEAR_MISS|INJURY|EQUIPMENT|CONCERN","category":"one of ${pack.categories.map((c) => c.key).join("|")}",` +
      `"severity":"LOW|MEDIUM|HIGH|CRITICAL","title":"max 80 chars","description":"the worker's facts, tidied, nothing added",` +
      `"immediateAction":"only if the note says something was done, else empty","injuryInvolved":true|false,"missing":["questions about missing facts"]}\n\nNote:\n${clean}`
  );
  const parsed = extractJson<Partial<ReportDraft>>(raw);
  if (!parsed) return fallback;
  const validCategory = pack.categories.some((c) => c.key === parsed.category);
  const validType = ["HAZARD", "NEAR_MISS", "INJURY", "EQUIPMENT", "CONCERN"].includes(String(parsed.type));
  const validSeverity = SEVERITY_ORDER.includes(parsed.severity as SeverityKey);
  return {
    type: validType ? String(parsed.type) : fallback.type,
    category: validCategory ? String(parsed.category) : fallback.category,
    severity: validSeverity ? (parsed.severity as SeverityKey) : fallback.severity,
    title: (parsed.title ? String(parsed.title) : fallback.title).slice(0, 120),
    description: parsed.description ? String(parsed.description) : fallback.description,
    immediateAction: parsed.immediateAction ? String(parsed.immediateAction) : "",
    injuryInvolved: typeof parsed.injuryInvolved === "boolean" ? parsed.injuryInvolved : fallback.injuryInvolved,
    missing: Array.isArray(parsed.missing) ? parsed.missing.map(String).slice(0, 5) : fallback.missing,
    generatedBy: "model",
  };
}

// ---------------------------------------------------------------------------
// Investigation support
// ---------------------------------------------------------------------------

type ReportFacts = {
  number: number;
  type: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  siteName: string | null;
  occurredAt: Date;
  injuryInvolved: boolean;
  immediateAction: string;
};

const CATEGORY_QUESTIONS: Record<string, string[]> = {
  FALLS: ["What fall protection was planned for this task, and was it available at the work location?", "How was the work area accessed, and had that access been inspected?", "Was the task changed or rushed compared with the plan?"],
  LADDERS_LIFTS: ["Who inspected the ladder, scaffold or lift, and when?", "Was the equipment appropriate for the task and the surface?", "Had the crew been trained or authorized on this equipment?"],
  ELECTRICAL: ["Was the circuit verified de-energized, and how was that confirmed?", "Was lockout/tagout planned for this task? If so, what was in place?", "Was the work described in the job plan as energized or de-energized?"],
  STRUCK_BY: ["What was overhead or moving at the time, and who else was in the area?", "Was the area barricaded or was there a spotter?", "How was the load or material secured?"],
  TOOLS: ["When was the tool last inspected, and by whom?", "Were guards and cords in place when it was issued?", "Was it the right tool for the job, and was it available when needed?"],
  FIRE: ["Was a hot-work permit or fire watch required for this task?", "What combustible materials were nearby?", "Where was the nearest extinguisher, and was it reachable?"],
  HOUSEKEEPING: ["Whose area was this and when was it last cleared?", "Was there a planned route for materials and cords?", "Did the schedule or other trades affect housekeeping?"],
  PPE: ["Was the needed PPE available on site and sized for the crew?", "Was the PPE requirement clear in the job plan?", "Was the PPE in usable condition?"],
  VEHICLES: ["Was there a traffic or backing plan for the area?", "What was the visibility and who was directing?", "How was the vehicle last inspected?"],
  MANUAL_HANDLING: ["Was mechanical help available for the load?", "How was the task planned around weight and reach?", "Was the crew rested and appropriately staffed?"],
  ENVIRONMENT: ["What were the conditions (temperature, wind, surface) at the time?", "Were breaks, water or shelter planned and available?", "Did the schedule allow for changing conditions?"],
  CHEMICALS_DUST: ["Which product or process created the exposure, and was its safety data sheet available?", "What controls (ventilation, wet cutting, respirators) were planned?", "How many people were in the area?"],
};

const GENERIC_QUESTIONS = [
  "What was the planned task and who assigned it?",
  "What was different from a normal day for this task?",
  "What did the person doing the work expect to happen?",
  "What existing procedure or job plan applied, and was it practical to follow?",
  "What time pressure, staffing or coordination issues existed?",
  "Has anything like this been reported before at this site or on similar work?",
];

export type QuestionDraft = { questions: string[]; generatedBy: Generated };

export async function draftInvestigationQuestions(facts: ReportFacts, existingFacts: string): Promise<QuestionDraft> {
  const raw = await askModel(
    `Draft 6 open, non-blaming investigation questions that focus on systems and conditions (planning, procedures, equipment, training, supervision, environment). ` +
      `Respond with ONLY JSON: {"questions":["..."]}\n\nReport #${facts.number} (${facts.type}, ${facts.category}, ${facts.severity}) at ${facts.siteName ?? "unspecified site"}:\n${facts.description}\nImmediate action: ${facts.immediateAction || "none recorded"}\nFacts gathered so far: ${existingFacts || "none yet"}`
  );
  const parsed = extractJson<{ questions?: string[] }>(raw);
  if (parsed?.questions?.length) return { questions: parsed.questions.map(String).slice(0, 8), generatedBy: "model" };
  const specific = CATEGORY_QUESTIONS[facts.category] ?? [];
  return { questions: [...specific, ...GENERIC_QUESTIONS.slice(0, Math.max(3, 6 - specific.length))], generatedBy: "rules" };
}

export type EvidenceCheck = { gaps: string[] };

/** Deterministic checks for thin evidence. No model: these are yes/no facts about what is recorded. */
export function findEvidenceGaps(input: {
  photoCount: number;
  statementCount: number;
  hasFacts: boolean;
  hasSequence: boolean;
  factorCount: number;
  hasRootCauseNotes: boolean;
  unansweredQuestions: number;
  actions: { ownerId: string | null; dueDate: Date | null }[];
  injuryInvolved: boolean;
}): EvidenceCheck {
  const gaps: string[] = [];
  if (!input.hasFacts) gaps.push("No facts recorded yet.");
  if (!input.hasSequence) gaps.push("No sequence of events written down.");
  if (input.photoCount === 0) gaps.push("No photos or attachments on the report.");
  if (input.statementCount === 0) gaps.push("No statements collected from people involved or nearby.");
  if (input.unansweredQuestions > 0) gaps.push(`${input.unansweredQuestions} investigation question${input.unansweredQuestions === 1 ? "" : "s"} still unanswered.`);
  if (input.factorCount === 0) gaps.push("No contributing factors selected.");
  if (!input.hasRootCauseNotes) gaps.push("Root-cause reasoning not written by the investigator yet.");
  if (input.actions.length === 0) gaps.push("No corrective actions proposed.");
  if (input.actions.some((a) => !a.ownerId)) gaps.push("A corrective action has no owner.");
  if (input.actions.some((a) => !a.dueDate)) gaps.push("A corrective action has no due date.");
  if (input.injuryInvolved && input.statementCount === 0) gaps.push("An injury is recorded but there is no statement about treatment or events.");
  return { gaps };
}

export type SummaryDraft = { text: string; generatedBy: Generated };

export async function summarizeInvestigation(input: {
  facts: ReportFacts;
  events: { at: Date; message: string; actor: string }[];
  investigation: { facts: string; sequenceNotes: string; contributingFactors: string[] } | null;
}): Promise<SummaryDraft> {
  const lines = input.events.map((e) => `${e.at.toISOString().slice(0, 16).replace("T", " ")} - ${e.message}${e.actor ? ` (${e.actor})` : ""}`);
  const raw = await askModel(
    `Summarize this report's timeline in a short factual paragraph for a safety manager, then a bulleted list of open questions. Use only these facts.\n\n` +
      `Report: ${input.facts.title}\n${input.facts.description}\nSite: ${input.facts.siteName ?? "n/a"}\nTimeline:\n${lines.join("\n")}\nInvestigation facts: ${input.investigation?.facts || "none"}\nSequence: ${input.investigation?.sequenceNotes || "none"}\nSelected factors: ${input.investigation?.contributingFactors.join(", ") || "none"}`
  );
  if (raw && raw.trim()) return { text: raw.trim(), generatedBy: "model" };
  const parts = [
    `Report #${input.facts.number}: ${input.facts.title}. Reported ${input.facts.occurredAt.toDateString()}${input.facts.siteName ? ` at ${input.facts.siteName}` : ""}.`,
    ...lines.map((l) => `• ${l}`),
  ];
  if (input.investigation?.contributingFactors.length) parts.push(`Contributing factors selected so far: ${input.investigation.contributingFactors.join("; ")}.`);
  return { text: parts.join("\n"), generatedBy: "rules" };
}

// ---------------------------------------------------------------------------
// Recurring themes
// ---------------------------------------------------------------------------

export async function summarizeThemes(input: {
  windowDays: number;
  byCategory: { label: string; count: number }[];
  bySite: { label: string; count: number }[];
  topFactors: { label: string; count: number }[];
  overdueActions: number;
  repeatPairs: { category: string; site: string; count: number }[];
}): Promise<SummaryDraft> {
  const facts = [
    `Window: last ${input.windowDays} days`,
    `Reports by category: ${input.byCategory.map((c) => `${c.label} ${c.count}`).join(", ") || "none"}`,
    `Reports by site: ${input.bySite.map((c) => `${c.label} ${c.count}`).join(", ") || "none"}`,
    `Most selected contributing factors: ${input.topFactors.map((c) => `${c.label} ${c.count}`).join(", ") || "none"}`,
    `Overdue corrective actions: ${input.overdueActions}`,
    `Same category at same site (repeat): ${input.repeatPairs.map((p) => `${p.category} at ${p.site} x${p.count}`).join(", ") || "none"}`,
  ];
  const raw = await askModel(`Write 3 to 5 short bullet points describing recurring themes a safety leader should look at. Do not add facts or causes. Do not judge people.\n\n${facts.join("\n")}`);
  if (raw && raw.trim()) return { text: raw.trim(), generatedBy: "model" };
  const bullets: string[] = [];
  for (const p of input.repeatPairs.slice(0, 3)) bullets.push(`${p.category} reports repeated ${p.count} times at ${p.site} in the last ${input.windowDays} days.`);
  if (input.byCategory[0]) bullets.push(`Most common category: ${input.byCategory[0].label} (${input.byCategory[0].count} reports).`);
  if (input.topFactors[0]) bullets.push(`Most selected contributing factor across investigations: ${input.topFactors[0].label} (${input.topFactors[0].count}).`);
  if (input.overdueActions > 0) bullets.push(`${input.overdueActions} corrective action${input.overdueActions === 1 ? " is" : "s are"} overdue.`);
  if (bullets.length === 0) bullets.push("Not enough recorded activity in this window to show patterns.");
  return { text: bullets.map((b) => `• ${b}`).join("\n"), generatedBy: "rules" };
}

// ---------------------------------------------------------------------------
// Toolbox talk outline from company-approved material
// ---------------------------------------------------------------------------

const TOPIC_DISCUSSION: Record<string, string[]> = {
  DEFAULT: ["What could go wrong with this task on our sites this week?", "What would you do if you saw this happening?", "What would make it easier to do this safely?"],
};

export async function draftToolboxTalk(input: { topic: string; sourceMaterial: string }): Promise<SummaryDraft> {
  const source = input.sourceMaterial.trim().slice(0, 6000);
  const raw = await askModel(
    `Draft a 5-minute toolbox talk outline titled for the topic below, using ONLY the approved material. Sections: Why it matters, Key points (max 5), Discussion questions (3), Sign-off line. ` +
      `If the material does not cover something, do not add it.\n\nTopic: ${input.topic}\n\nApproved material:\n${source}`
  );
  if (raw && raw.trim()) return { text: raw.trim(), generatedBy: "model" };
  const sentences = source.split(/(?<=[.!?])\s+|\n+/).map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter((s) => s.length > 15);
  const points = sentences.slice(0, 5);
  const text = [
    `${input.topic}`,
    "",
    "Why it matters",
    sentences[0] ? sentences[0] : "Add why this topic matters to your crews.",
    "",
    "Key points (from the material you provided)",
    ...(points.length ? points.map((p) => `• ${p}`) : ["• Add the key points from your approved material."]),
    "",
    "Discussion questions",
    ...TOPIC_DISCUSSION.DEFAULT.map((q) => `• ${q}`),
    "",
    "Sign-off: Everyone attending confirms they heard and understood the points above.",
  ].join("\n");
  return { text, generatedBy: "rules" };
}
