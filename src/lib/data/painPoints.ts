export type PainPointOption = { key: string; label: string; keywords: string[] };

/**
 * A small, generic-enough-for-any-department taxonomy used to bias which
 * catalog workflows get suggested as opportunities during onboarding, and
 * to explain *why* one was suggested ("matches: Reporting and summarizing").
 * Matching is a simple case-insensitive keyword search against a workflow's
 * title/summary/current process - deliberately simple and inspectable
 * rather than a black box, same philosophy as the scoring model.
 */
export const PAIN_POINT_OPTIONS: PainPointOption[] = [
  { key: "manual_data_entry", label: "Manual data entry", keywords: ["data entry", "manual entry", "spreadsheet", "re-key", "input data"] },
  { key: "drafting_content", label: "Writing or drafting content", keywords: ["draft", "writing", "write", "content", "copywrit"] },
  { key: "research_analysis", label: "Research and analysis", keywords: ["research", "analyz", "analysis"] },
  { key: "reporting", label: "Reporting and summarizing", keywords: ["report", "summar"] },
  { key: "customer_communication", label: "Customer or client communication", keywords: ["customer", "client", "response time", "support ticket", "email"] },
  { key: "scheduling_coordination", label: "Scheduling and coordination", keywords: ["schedul", "coordinat", "meeting", "calendar"] },
  { key: "compliance_docs", label: "Compliance and documentation", keywords: ["complian", "documentation", "audit", "policy", "regulat"] },
  { key: "approvals_reviews", label: "Repetitive approvals or reviews", keywords: ["approv", "review", "checklist", "quality check"] },
];
