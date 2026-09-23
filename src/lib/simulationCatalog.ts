import type { ComplexityLevel } from "@prisma/client";

export type SimulationSeed = {
  title: string;
  department: string;
  difficulty: ComplexityLevel;
  description: string;
  scenario: string;
};

/**
 * Single source of truth for simulation content - used by the initial
 * seed script and by ensureSimulationCatalog() (idempotent runtime
 * top-up, same pattern as GLOBAL_TOOL_CATALOG) so new simulations reach
 * already-provisioned organizations without a full reseed.
 */
export const SIMULATION_CATALOG: SimulationSeed[] = [
  {
    title: "Inbound Lead Triage Simulation",
    department: "Sales",
    difficulty: "MEDIUM",
    description: "Practice prioritizing inbound leads under time pressure using AI research.",
    scenario:
      "You have 15 inbound leads that came in overnight. You have 30 minutes before your first call. Decide which 3 should receive immediate outreach today, and explain how you'd use AI to research and draft that outreach.",
  },
  {
    title: "Customer Escalation Response Simulation",
    department: "Customer Support",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft a response to an upset customer without losing the human touch.",
    scenario:
      "A customer has emailed twice in 3 days about a delayed order and is now threatening to cancel their account. Walk through how you'd use AI to draft a response, what you'd verify before sending, and when you'd escalate to a manager instead.",
  },
  {
    title: "Campaign Brief Simulation",
    department: "Marketing",
    difficulty: "LOW",
    description: "Practice turning a vague campaign request into a structured, AI-assisted brief.",
    scenario:
      "Your VP says: 'We need something to drive awareness for the new product line before the holidays.' Walk through how you'd use AI to turn this into a structured campaign brief, including audience, channels, and key message.",
  },
  {
    title: "Budget Variance Review Simulation",
    department: "Finance",
    difficulty: "MEDIUM",
    description: "Practice using AI to explain a month-end variance without overstating certainty.",
    scenario:
      "Month-end close shows three departments 12-18% over budget with no obvious single cause. Leadership wants an explanation memo by tomorrow morning. Walk through how you'd use AI to draft the variance explanation, which numbers you'd verify against the general ledger before including them, and what you'd flag as still uncertain.",
  },
  {
    title: "Candidate Screening Simulation",
    department: "HR",
    difficulty: "HIGH",
    description: "Practice using AI to speed up resume screening while avoiding bias and unfair rejections.",
    scenario:
      "You have 80 applications for one role and need a shortlist of 8 by end of day. Walk through how you'd use AI to help screen resumes against the job requirements, what you'd deliberately keep a human eye on to avoid biased or unfair filtering, and how you'd document the decision in case it's ever questioned.",
  },
  {
    title: "Vendor Delay Contingency Simulation",
    department: "Operations",
    difficulty: "MEDIUM",
    description: "Practice using AI to model contingency options when a key supplier slips.",
    scenario:
      "Your primary packaging supplier just notified you of a 3-week delay, and you have committed shipments in 10 days. Walk through how you'd use AI to model contingency options (alternate suppliers, partial shipments, customer communication), and what you would verify with the supplier or your team directly before committing to a plan.",
  },
  {
    title: "Feature Prioritization Simulation",
    department: "Product",
    difficulty: "MEDIUM",
    description: "Practice using AI to synthesize conflicting stakeholder input into a defensible roadmap call.",
    scenario:
      "Sales wants a feature to close a big deal this quarter. Support says a different fix would cut ticket volume 20%. Engineering has capacity for one, not both. Walk through how you'd use AI to synthesize the customer feedback and data behind each request, and how you'd present the trade-off and your recommendation to stakeholders.",
  },
  {
    title: "Contract Redline Simulation",
    department: "Legal",
    difficulty: "HIGH",
    description: "Practice using AI to speed up a first-pass contract review without skipping legal judgment.",
    scenario:
      "A vendor sent back a services agreement with several clauses changed, including limitation of liability and data handling terms. Walk through how you'd use AI to do a first-pass comparison against your standard terms and draft suggested redlines, and specifically what you would never let AI decide on its own before it reaches a licensed attorney's review.",
  },
  {
    title: "Board Update Simulation",
    department: "Executive",
    difficulty: "MEDIUM",
    description: "Practice using AI to turn scattered team updates into a tight, accurate board memo.",
    scenario:
      "You have five separate Slack updates and a rough metrics spreadsheet from your team leads, and a board memo is due in 2 hours. Walk through how you'd use AI to synthesize this into a one-page update, and what facts and figures you would personally verify before it goes to the board.",
  },
  {
    title: "Incident Postmortem Simulation",
    department: "Engineering",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft an incident timeline and root-cause writeup without guessing at facts.",
    scenario:
      "A production outage lasted 40 minutes last night. You have scattered log excerpts, a Slack incident channel transcript, and your own memory of what happened. Walk through how you'd use AI to draft the postmortem timeline and root-cause summary, and what you would cross-check against actual logs before publishing it.",
  },
];
