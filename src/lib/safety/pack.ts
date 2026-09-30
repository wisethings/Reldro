/**
 * The vocabulary of the safety product, kept in code (not the database) so a
 * new industry is a new "pack", not a schema change. Only the construction
 * specialty-contractor pack exists today; everything else reads through
 * getPack() so adding warehousing/logistics later means adding an entry here.
 */

export type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "blue";

export const SEVERITIES = [
  { key: "LOW", label: "Minor", plain: "No injury and little chance of harm", tone: "neutral" as Tone },
  { key: "MEDIUM", label: "Moderate", plain: "Could cause an injury that keeps someone off work", tone: "amber" as Tone },
  { key: "HIGH", label: "Serious", plain: "Could cause a serious injury", tone: "red" as Tone },
  { key: "CRITICAL", label: "Life-threatening", plain: "Could cause a death or permanent harm", tone: "red" as Tone },
] as const;
export type SeverityKey = (typeof SEVERITIES)[number]["key"];
export const SEVERITY_ORDER: SeverityKey[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const severityRank = (s: string) => Math.max(0, SEVERITY_ORDER.indexOf(s as SeverityKey));
export const severityInfo = (s: string) => SEVERITIES.find((x) => x.key === s) ?? SEVERITIES[0];

export const REPORT_TYPES = [
  { key: "HAZARD", label: "Hazard", plain: "A condition that could cause harm" },
  { key: "NEAR_MISS", label: "Near miss", plain: "An event that could have caused harm but did not" },
  { key: "INJURY", label: "Injury or illness", plain: "Someone was injured or became ill" },
  { key: "EQUIPMENT", label: "Equipment issue", plain: "Equipment is damaged, missing, or unsafe to use" },
  { key: "CONCERN", label: "Other concern", plain: "Another issue that could affect safety" },
] as const;
export type ReportTypeKey = (typeof REPORT_TYPES)[number]["key"];
export const reportTypeLabel = (k: string) => REPORT_TYPES.find((t) => t.key === k)?.label ?? k;

export const REPORT_STATUSES = [
  { key: "NEW", label: "New", tone: "amber" as Tone },
  { key: "ASSIGNED", label: "Assigned", tone: "blue" as Tone },
  { key: "INVESTIGATING", label: "Under investigation", tone: "brand" as Tone },
  { key: "ACTIONS_OPEN", label: "Corrective actions open", tone: "amber" as Tone },
  { key: "CLOSED", label: "Closed", tone: "green" as Tone },
] as const;
export const reportStatusInfo = (k: string) => REPORT_STATUSES.find((s) => s.key === k) ?? REPORT_STATUSES[0];

export const ACTION_STATUSES = [
  { key: "PROPOSED", label: "Proposed", tone: "neutral" as Tone, hint: "Waiting for approval" },
  { key: "APPROVED", label: "Open", tone: "blue" as Tone, hint: "Approved and not started" },
  { key: "IN_PROGRESS", label: "In progress", tone: "amber" as Tone, hint: "Owner is working on it" },
  { key: "COMPLETED", label: "Ready to verify", tone: "brand" as Tone, hint: "The owner says it is done. Someone else needs to check it." },
  { key: "VERIFIED", label: "Verified", tone: "green" as Tone, hint: "Someone confirmed the fix is in place" },
  { key: "CANCELLED", label: "Cancelled", tone: "neutral" as Tone, hint: "No longer needed" },
] as const;
export const actionStatusInfo = (k: string) => ACTION_STATUSES.find((s) => s.key === k) ?? ACTION_STATUSES[0];
export const OPEN_ACTION_STATUSES = ["PROPOSED", "APPROVED", "IN_PROGRESS", "COMPLETED"];

export const INVESTIGATION_STATUSES = [
  { key: "OPEN", label: "Open", tone: "amber" as Tone },
  { key: "IN_REVIEW", label: "In review", tone: "brand" as Tone },
  { key: "COMPLETE", label: "Complete", tone: "green" as Tone },
] as const;
export const investigationStatusInfo = (k: string) => INVESTIGATION_STATUSES.find((s) => s.key === k) ?? INVESTIGATION_STATUSES[0];

export const SITE_KINDS = [
  { key: "JOBSITE", label: "Jobsite" },
  { key: "SHOP", label: "Shop or fabrication shop" },
  { key: "YARD", label: "Yard or laydown area" },
  { key: "WAREHOUSE", label: "Warehouse or distribution center" },
  { key: "CUSTOMER_SITE", label: "Customer site for service work" },
] as const;

export const INCIDENT_STATUSES = [
  { key: "ACTIVE", label: "Active response", tone: "red" as Tone, hint: "Responders are working the situation" },
  { key: "MONITORING", label: "Monitoring", tone: "amber" as Tone, hint: "Immediate response done; watching and following up" },
  { key: "RESOLVED", label: "Resolved", tone: "green" as Tone, hint: "Response finished and closed out" },
] as const;
export const incidentStatusInfo = (k: string) => INCIDENT_STATUSES.find((s) => s.key === k) ?? INCIDENT_STATUSES[0];

/** Timeline entry types a person can add by hand in the incident workspace. */
export const INCIDENT_ENTRY_TYPES = [
  { key: "UPDATE", label: "Update", hint: "What has changed, for everyone responding" },
  { key: "DECISION", label: "Decision", hint: "A call that was made, and by whom" },
  { key: "EVIDENCE", label: "Photos", hint: "Photos with a short note on what they show" },
  { key: "COMMENT", label: "Note", hint: "A working note for the team" },
] as const;

export const RESPONDER_ROLE_SUGGESTIONS = ["Response lead", "Site lead", "Supervisor", "Safety", "Medical / first aid liaison", "Communications", "Records"];

/** Best-guess topic for a piece of text, from the pack's keyword lists. Only ever a starting point. */
export function guessCategory(text: string, pack: SafetyPack): string {
  const t = ` ${text.toLowerCase()} `;
  let best = { key: "OTHER", score: 0 };
  for (const c of pack.categories) {
    const score = c.keywords.reduce((n, k) => (t.includes(k) ? n + 1 : n), 0);
    if (score > best.score) best = { key: c.key, score };
  }
  return best.key;
}

/**
 * A starting suggestion for how serious a report might be, from the report kind, the words used
 * and whether anyone was hurt. Reporters never choose this; a responder confirms or changes it.
 */
export function suggestSeverity(text: string, type: string, injuryInvolved: boolean, pack: SafetyPack): SeverityKey {
  const t = ` ${text.toLowerCase()} `;
  let sev: SeverityKey = type === "CONCERN" ? "LOW" : "MEDIUM";
  if (injuryInvolved && sev === "LOW") sev = "MEDIUM";
  if (pack.severityKeywords.HIGH.some((k) => t.includes(k))) sev = "HIGH";
  if (pack.severityKeywords.CRITICAL.some((k) => t.includes(k))) sev = "CRITICAL";
  return sev;
}

export type PackCategory = { key: string; label: string; keywords: string[] };

export type SafetyPack = {
  id: string;
  name: string;
  categories: PackCategory[];
  /** System-and-conditions prompts for an investigation - deliberately not "who to blame". */
  contributingFactors: string[];
  qualificationSuggestions: string[];
  /** A neutral example shown as a placeholder when adding a site. */
  siteExample: string;
  inspectionTemplates: { name: string; kind: "SITE_INSPECTION" | "READINESS" | "OBSERVATION"; frequencyDays: number | null; items: { label: string; critical?: boolean }[] }[];
  /** Words in a description that suggest higher severity. A hint for a person to confirm, never a decision. */
  severityKeywords: { CRITICAL: string[]; HIGH: string[] };
};

const CONSTRUCTION: SafetyPack = {
  id: "construction",
  name: "Construction specialty contractor",
  categories: [
    { key: "FALLS", label: "Falls and working at height", keywords: ["fall", "fell", "edge", "roof", "height", "harness", "fall protection", "open hole", "floor opening"] },
    { key: "LADDERS_LIFTS", label: "Ladders, scaffolds and lifts", keywords: ["ladder", "scaffold", "scissor", "boom", "aerial", "lift ", "stepladder"] },
    { key: "ELECTRICAL", label: "Electrical and energized work", keywords: ["energized", "live ", "lockout", "loto", "tagout", "arc", "shock", "panel", "breaker", "voltage", "exposed wire", "cord", "gfci"] },
    { key: "STRUCK_BY", label: "Struck-by and falling objects", keywords: ["struck", "falling", "dropped", "overhead", "hit by", "swing", "crane", "load"] },
    { key: "TOOLS", label: "Tools and equipment", keywords: ["tool", "saw", "drill", "grinder", "guard", "damaged", "frayed", "bandsaw", "threader", "power"] },
    { key: "FIRE", label: "Fire and hot work", keywords: ["fire", "spark", "welding", "hot work", "torch", "smoke", "extinguisher", "flammable"] },
    { key: "HOUSEKEEPING", label: "Housekeeping, access and trip hazards", keywords: ["trip", "slip", "debris", "clutter", "walkway", "cord across", "wet", "mud", "blocked", "egress"] },
    { key: "PPE", label: "PPE", keywords: ["ppe", "glasses", "gloves", "hard hat", "helmet", "hearing", "vest", "respirator", "mask"] },
    { key: "VEHICLES", label: "Vehicles and traffic", keywords: ["truck", "van", "vehicle", "forklift", "traffic", "backing", "reverse", "driving"] },
    { key: "MANUAL_HANDLING", label: "Lifting and manual handling", keywords: ["lifting", "strain", "back", "heavy", "carry", "sprain", "pulled a muscle", "reel", "conduit bundle"] },
    { key: "ENVIRONMENT", label: "Heat, cold and weather", keywords: ["heat", "hot day", "dehydrat", "cold", "wind", "storm", "lightning", "rain", "ice"] },
    { key: "CHEMICALS_DUST", label: "Chemicals, dust and fumes", keywords: ["silica", "dust", "chemical", "fumes", "solvent", "asbestos", "adhesive", "cutting concrete"] },
    { key: "OTHER", label: "Other", keywords: [] },
  ],
  contributingFactors: [
    "Planning or scheduling pressure",
    "Procedure missing, unclear or not followed in practice",
    "Training or experience gap",
    "Supervision or communication",
    "Equipment condition or availability",
    "Site layout, access or housekeeping",
    "Task design or workload",
    "Environmental conditions",
    "Coordination with other trades",
    "PPE availability or suitability",
  ],
  siteExample: "Bayside Tower \u2014 Electrical Package",
  qualificationSuggestions: ["OSHA 10", "OSHA 30", "First aid / CPR", "Aerial lift", "Fall protection", "Confined space", "Electrical safety (NFPA 70E)", "Forklift"],
  severityKeywords: {
    CRITICAL: ["unconscious", "not breathing", "electrocut", "amputat", "fatal", "died", "collapse", "trapped", "hospital", "severe bleeding"],
    HIGH: ["fell from", "fall from", "arc flash", "shock", "broken", "fracture", "energized", "no harness", "unprotected edge", "struck by", "burn"],
  },
  inspectionTemplates: [
    {
      name: "Weekly jobsite safety walk",
      kind: "SITE_INSPECTION",
      frequencyDays: 7,
      items: [
        { label: "Walkways and access routes are clear", critical: false },
        { label: "Fall protection in place at edges and openings", critical: true },
        { label: "Ladders and lifts inspected and in good condition", critical: true },
        { label: "Temporary power: GFCIs used, cords undamaged", critical: true },
        { label: "Lockout/tagout followed for any energized work", critical: true },
        { label: "Fire extinguishers accessible and charged", critical: false },
        { label: "Crew wearing required PPE", critical: false },
        { label: "First aid kit stocked and location known", critical: false },
      ],
    },
    {
      name: "Job start readiness check",
      kind: "READINESS",
      frequencyDays: null,
      items: [
        { label: "Task hazards reviewed with the crew before starting", critical: true },
        { label: "Required permits and utility locates in place", critical: true },
        { label: "Emergency contacts and nearest hospital posted", critical: false },
        { label: "Tools and cords inspected before use", critical: false },
        { label: "Crew qualifications match the work (lifts, confined space, etc.)", critical: true },
      ],
    },
    {
      name: "Safety observation (5 minutes)",
      kind: "OBSERVATION",
      frequencyDays: null,
      items: [
        { label: "Working safely as planned", critical: false },
        { label: "PPE worn correctly", critical: false },
        { label: "Tools used as intended", critical: false },
        { label: "Housekeeping acceptable", critical: false },
      ],
    },
  ],
};

const PACKS: Record<string, SafetyPack> = { construction: CONSTRUCTION };

/** Picks the pack for an organization. Only construction exists today, so everyone gets it. */
export function getPack(_industry?: string | null): SafetyPack {
  return PACKS.construction;
}

export const categoryLabel = (key: string, pack: SafetyPack = CONSTRUCTION) => pack.categories.find((c) => c.key === key)?.label ?? key;

export const INSPECTION_KIND_LABEL: Record<string, string> = {
  SITE_INSPECTION: "Site inspection",
  READINESS: "Readiness check",
  OBSERVATION: "Observation",
};
