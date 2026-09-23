import type { ComplexityLevel } from "@prisma/client";
import type { EmployeeSkillCategory } from "@/lib/scoring";

export type DecisionOption = {
  id: string;
  label: string;
  quality: "strong" | "partial" | "weak";
  consequence: string;
};

export type AiOutputIssue = {
  id: string;
  label: string;
  present: boolean;
};

export type SimulationSeed = {
  title: string;
  department: string;
  difficulty: ComplexityLevel;
  description: string;
  scenario: string;
  role: string;
  objective: string;
  availableTools: string[];
  companyPolicy: string;
  workflowNote: string;
  constraints: string;
  successCriteria: string;
  timeLimitMinutes: number;
  decisionPrompt: string;
  decisionOptions: DecisionOption[];
  aiOutputSample: string;
  aiOutputIssues: AiOutputIssue[];
  expertApproach: string;
  skills: EmployeeSkillCategory[];
};

/**
 * Single source of truth for simulation content - used by the initial seed
 * script and by ensureSimulationCatalog() (idempotent runtime top-up) so new
 * simulations reach already-provisioned organizations without a full reseed.
 *
 * Each simulation is a real branching judgment exercise, not a quiz: a
 * decision point with consequences that vary by choice quality, a planted-
 * error AI output to evaluate, and a final open-ended reasoning prompt.
 * Scoring (simulationEvaluator.ts) reads all three plus this file's ground
 * truth (decisionOptions[].quality, aiOutputIssues[].present).
 */
export const SIMULATION_CATALOG: SimulationSeed[] = [
  {
    title: "Inbound Lead Triage Simulation",
    department: "Sales",
    difficulty: "MEDIUM",
    description: "Practice prioritizing inbound leads under time pressure using AI research.",
    role: "Account Executive, Northstar Consumer Group",
    objective: "Decide which inbound leads deserve immediate outreach today, and how AI should support that outreach.",
    availableTools: ["ChatGPT", "Salesforce"],
    companyPolicy: "Only publicly available company information may be pasted into ChatGPT. Never paste a prospect's internal emails or contract terms into any AI tool.",
    workflowNote: "AI-Assisted Sales Prospecting: AI researches the account, drafts personalized outreach, and pre-fills CRM fields for rep approval.",
    constraints: "You have 30 minutes before your first scheduled call. You cannot research all 15 leads in that time.",
    successCriteria: "You prioritize leads using explicit criteria (not gut feel), use AI to accelerate research without inventing facts about a prospect, and keep a human check before anything goes out.",
    timeLimitMinutes: 30,
    scenario:
      "You have 15 inbound leads that came in overnight. You have 30 minutes before your first call. Explain how you'd use AI to research and draft outreach for the leads you prioritized, and what you'd verify before sending anything.",
    decisionPrompt: "It's 8:45am. You have 15 new leads and a call at 9:15. What do you do first?",
    decisionOptions: [
      {
        id: "criteria-first",
        label: "Quickly score all 15 leads against firmographic fit and urgency signals, then have AI research only the top 3.",
        quality: "strong",
        consequence: "You identify the top 3 leads in 6 minutes and have AI-researched, personalized outreach drafted for all 3 before your call — with 15+ minutes to spare for review.",
      },
      {
        id: "first-come",
        label: "Start researching leads in the order they arrived, since the first ones came in earliest.",
        quality: "partial",
        consequence: "You research 4 leads thoroughly, but two of them turn out to be poor fits — you run out of time before reaching the highest-value lead in the batch, who a competitor calls first.",
      },
      {
        id: "ai-blast",
        label: "Have AI draft outreach for all 15 leads at once and send them without individual review to save time.",
        quality: "weak",
        consequence: "AI invents a plausible-sounding but incorrect detail about one prospect's recent funding round. It goes out unreviewed, and the prospect replies pointing out the error — damaging credibility before the relationship even starts.",
      },
    ],
    aiOutputSample:
      "Acme Retail Co. is a 450-person specialty retailer based in Denver, CO. They raised a $40M Series C in March led by Beacon Ventures, and are aggressively expanding into 12 new markets this year. Their VP of Operations, Dana Kim, has posted publicly about struggling with manual inventory forecasting across their growing store footprint. This looks like a strong-fit account for our demand forecasting workflow, and the recent funding suggests budget is available.",
    aiOutputIssues: [
      { id: "unverified-funding", label: "A specific funding amount and lead investor are stated as fact without a cited source", present: true },
      { id: "assumes-budget", label: "The output assumes budget availability from funding news alone, which isn't a reliable signal on its own", present: true },
      { id: "cites-public-post", label: "The pain point (manual forecasting) is attributed to something the person posted publicly, which is a reasonable, checkable source", present: false },
      { id: "recommends-fabricated-contact", label: "The output invents a personal email address for the VP that isn't in any public source", present: false },
      { id: "overconfident-fit", label: "The output states this 'looks like a strong-fit account' as a suggestion, not as a guaranteed close", present: false },
    ],
    expertApproach:
      "A strong rep treats AI research as a hypothesis generator, not a source of record: verify the funding figure and investor name against a real source (Crunchbase, the company's own press release) before it appears in outreach, and never state financial claims to a prospect that you haven't personally confirmed. The publicly-posted pain point is fair game to reference directly since it's independently checkable. Time-box research to your top-scored leads only — spreading AI research evenly across 15 leads guarantees shallow, unverified output on all of them.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Customer Escalation Response Simulation",
    department: "Customer Support",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft a response to an upset customer without losing the human touch.",
    role: "Senior Support Agent, Northstar Consumer Group",
    objective: "Resolve a repeat customer complaint with an AI-assisted response while protecting the relationship.",
    availableTools: ["Claude", "Zendesk"],
    companyPolicy: "Customer PII (full name plus account/order number together) must stay inside Zendesk. When using an external AI tool, reference tickets by ID only, not by pasting full customer records.",
    workflowNote: "AI Conversation Summarization & Response Drafting: AI summarizes the conversation, classifies intent, drafts a response, and flags escalation risk for agent review.",
    constraints: "The customer has already contacted you twice in 3 days. A third unsatisfying reply risks cancellation.",
    successCriteria: "The response acknowledges the repeat contact specifically, offers a concrete resolution (not just an apology), and you catch any overpromise before it's sent.",
    timeLimitMinutes: 15,
    scenario:
      "A customer has emailed twice in 3 days about a delayed order and is now threatening to cancel their account. Walk through how you'd use AI to draft a response, what you'd verify before sending, and when you'd escalate to a manager instead.",
    decisionPrompt: "You open the ticket. What's your first move?",
    decisionOptions: [
      {
        id: "check-order-first",
        label: "Pull the real order status and refund eligibility from the order system before drafting anything.",
        quality: "strong",
        consequence: "You confirm the order is genuinely 4 days overdue and refund-eligible. Your AI draft can now state a real, accurate resolution instead of a vague apology.",
      },
      {
        id: "draft-then-check",
        label: "Ask AI to draft an empathetic response first, then check the order details afterward.",
        quality: "partial",
        consequence: "The draft is warm and well-written but promises a delivery date AI guessed at. You catch it before sending, but lose several minutes rewriting the one concrete claim that mattered most.",
      },
      {
        id: "send-apology",
        label: "Send a quick empathetic apology now and deal with the order details later today.",
        quality: "weak",
        consequence: "The customer replies within the hour: 'An apology doesn't tell me where my order is.' The third contact you were trying to prevent happens anyway, and now with more frustration.",
      },
    ],
    aiOutputSample:
      "Hi there, I'm so sorry for the frustration this delay has caused. I completely understand how upsetting this must be. I've gone ahead and expedited your order — you'll have it by tomorrow morning, guaranteed. As an apology, I've also issued a full refund of your shipping cost. Please let me know if there's anything else I can do!",
    aiOutputIssues: [
      { id: "guaranteed-date", label: "The reply guarantees a specific delivery date the agent hasn't actually confirmed with fulfillment", present: true },
      { id: "refund-not-issued", label: "The reply states a refund has already been issued, but no refund has actually been processed yet", present: true },
      { id: "acknowledges-repeat-contact", label: "The reply specifically acknowledges this is the customer's second contact about the same issue", present: false },
      { id: "warm-tone", label: "The reply opens with an empathetic, non-defensive tone appropriate for a frustrated customer", present: true },
      { id: "invents-tracking-number", label: "The reply includes a fabricated tracking number", present: false },
    ],
    expertApproach:
      "Never let an AI draft state an action ('I've issued a refund,' 'guaranteed by tomorrow') that hasn't actually been taken — verify or take the action first, then let the draft describe what's true. On a second or third contact about the same issue, always acknowledge that history explicitly; customers escalate tone when they feel unheard, not just when they're inconvenienced. The empathetic tone AI produced was worth keeping — the fix here is accuracy, not warmth.",
    skills: ["evaluation", "prompting"],
  },
  {
    title: "Campaign Brief Simulation",
    department: "Marketing",
    difficulty: "LOW",
    description: "Practice turning a vague campaign request into a structured, AI-assisted brief.",
    role: "Marketing Manager, Northstar Consumer Group",
    objective: "Turn a one-line executive request into a structured campaign brief using AI, without losing the strategic details only you know.",
    availableTools: ["Claude", "HubSpot"],
    companyPolicy: "Draft campaign copy may use AI freely. Final claims about pricing or product availability must be verified against the current price sheet before publishing.",
    workflowNote: "AI-Generated Campaign Briefs & Copy Drafts: AI drafts a campaign brief and channel-specific copy variants from a single input brief for marketer review.",
    constraints: "The VP gave you one sentence of direction and is not available for follow-up questions until tomorrow.",
    successCriteria: "The brief AI produces reflects real constraints (budget, timeline, audience) you supply, not generic assumptions AI fills in on its own.",
    timeLimitMinutes: 20,
    scenario:
      "Your VP says: 'We need something to drive awareness for the new product line before the holidays.' Walk through how you'd use AI to turn this into a structured campaign brief, including audience, channels, and key message.",
    decisionPrompt: "Before asking AI to draft the brief, what do you do?",
    decisionOptions: [
      {
        id: "supply-context",
        label: "Write out what you actually know — target audience, budget ballpark, timeline, prior campaign performance — then ask AI to structure it into a brief.",
        quality: "strong",
        consequence: "The brief AI produces reflects your team's real constraints and reads like something your VP would recognize, not a generic template.",
      },
      {
        id: "one-liner-prompt",
        label: "Paste the VP's one sentence directly into AI and ask for a full campaign brief.",
        quality: "partial",
        consequence: "AI produces a polished-looking brief, but it invents a generic target audience and budget that don't match your actual customer base — you have to redo the audience section from scratch.",
      },
      {
        id: "skip-brief",
        label: "Skip the brief and go straight to asking AI for social media copy, since that's what will ship fastest.",
        quality: "weak",
        consequence: "The copy looks fine in isolation, but without an agreed brief, two teammates draft conflicting messaging for the same launch and it's caught only after both are half-built.",
      },
    ],
    aiOutputSample:
      "Campaign Brief: Holiday Product Line Awareness\nAudience: General consumers aged 18-65 interested in retail products.\nBudget: $50,000 recommended based on typical holiday campaigns.\nChannels: Email, social media, and paid search.\nKey message: 'Discover something new this holiday season.'",
    aiOutputIssues: [
      { id: "generic-audience", label: "The audience is defined so broadly ('18-65, interested in retail') that it isn't actionable for targeting", present: true },
      { id: "invented-budget", label: "The budget figure is presented as a recommendation but has no basis in this company's actual marketing spend", present: true },
      { id: "channels-reasonable", label: "The suggested channels (email, social, paid search) are a reasonable generic starting point to react to, not a factual claim", present: false },
      { id: "message-too-generic", label: "The key message doesn't reference anything specific about the new product line", present: true },
      { id: "fabricates-past-performance", label: "The brief cites specific results from a past campaign that never happened", present: false },
    ],
    expertApproach:
      "Generic-in, generic-out: a one-sentence prompt with no real constraints will always produce a brief that sounds plausible but fits no one's actual budget or audience. Before drafting, supply AI with the 2-3 concrete facts only you have — actual budget range, who the product line is really for, what's worked before — and ask it to structure those into a brief, not invent them.",
    skills: ["prompting", "fundamentals"],
  },
  {
    title: "Budget Variance Review Simulation",
    department: "Finance",
    difficulty: "MEDIUM",
    description: "Practice using AI to explain a month-end variance without overstating certainty.",
    role: "Senior Financial Analyst, Northstar Consumer Group",
    objective: "Draft an accurate variance explanation for leadership using AI, without asserting causes you haven't confirmed.",
    availableTools: ["ChatGPT", "QuickBooks"],
    companyPolicy: "Only aggregated, department-level figures may be used with the general-purpose AI tool. Line-item transaction detail stays inside QuickBooks and approved finance systems.",
    workflowNote: "AI-Assisted Monthly Reporting Narratives: AI drafts the narrative and variance commentary directly from the numbers; analysts review and finalize.",
    constraints: "The explanation memo is due to leadership tomorrow morning, and you don't yet have confirmed root causes for all three departments.",
    successCriteria: "Every causal claim in the final memo is either confirmed with the department or explicitly marked as still under investigation — never stated as fact from the numbers alone.",
    timeLimitMinutes: 45,
    scenario:
      "Month-end close shows three departments 12-18% over budget with no obvious single cause. Leadership wants an explanation memo by tomorrow morning. Walk through how you'd use AI to draft the variance explanation, which numbers you'd verify against the general ledger before including them, and what you'd flag as still uncertain.",
    decisionPrompt: "You have the variance numbers but no confirmed explanations yet. What's your next step?",
    decisionOptions: [
      {
        id: "flag-then-draft",
        label: "Message the three department leads now for likely causes, and have AI draft the memo with placeholders for anything unconfirmed by morning.",
        quality: "strong",
        consequence: "Two departments respond by end of day with real explanations you can cite confidently; the memo clearly flags the third as still under review — an honest, defensible document.",
      },
      {
        id: "ai-infer-cause",
        label: "Ask AI to infer likely causes directly from the variance percentages and historical spending patterns.",
        quality: "partial",
        consequence: "AI produces plausible-sounding explanations that read well, but one is wrong — the real cause was a one-time vendor prepayment, not the recurring overspend AI inferred. Leadership makes a follow-up decision based on the wrong assumption.",
      },
      {
        id: "wait-for-all",
        label: "Wait until you have confirmed causes from all three departments before drafting anything.",
        quality: "weak",
        consequence: "Two department leads don't respond until after your deadline. You miss the leadership meeting with nothing to show, when a partial-but-honest memo would have been enough.",
      },
    ],
    aiOutputSample:
      "Marketing's 18% overage is primarily due to increased ad spend ahead of the holiday season, a planned and expected seasonal pattern. Operations' 14% overage is likely attributable to rising freight costs industry-wide. Finance's 12% overage appears to stem from a one-time software licensing renewal.",
    aiOutputIssues: [
      { id: "marketing-labeled-planned", label: "Marketing's overage is described as 'planned and expected' without confirming that with the marketing team", present: true },
      { id: "operations-hedge-word", label: "Operations' cause is described with 'likely attributable,' correctly flagging it as inferred rather than confirmed", present: false },
      { id: "finance-stated-as-fact", label: "Finance's cause is stated as established fact ('appears to stem from') based only on the dollar amount matching a plausible category", present: true },
      { id: "no-actual-verification", label: "None of the three explanations reference having been checked against actual invoices, vendor records, or department confirmation", present: true },
      { id: "consistent-format", label: "All three departments are described in a consistent, comparable format", present: false },
    ],
    expertApproach:
      "AI can pattern-match a plausible cause from a dollar amount, but 'plausible' isn't 'confirmed' — the difference matters most in a document leadership will act on. Keep AI's hedging language ('likely,' 'appears to') where a cause is genuinely unconfirmed, but never let it firm up into a stated fact just because it reads more polished. If a real answer isn't available by the deadline, say so directly rather than letting an inferred explanation stand in for one.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Candidate Screening Simulation",
    department: "HR",
    difficulty: "HIGH",
    description: "Practice using AI to speed up resume screening while avoiding bias and unfair rejections.",
    role: "Talent Acquisition Partner, Northstar Consumer Group",
    objective: "Produce a defensible shortlist of 8 candidates from 80 applications using AI screening support.",
    availableTools: ["ChatGPT", "Notion"],
    companyPolicy: "AI may assist with screening against explicit, written job requirements only. AI must never be the sole basis for rejecting a candidate, and screening criteria must be documented in case of an audit.",
    workflowNote: "AI-Assisted Job Descriptions & Resume Screening: AI drafts job descriptions and pre-screens resumes against role criteria for recruiter review.",
    constraints: "You have 80 applications and need a defensible shortlist of 8 by end of day.",
    successCriteria: "The screening criteria are explicit and written down before screening starts, and you personally spot-check a sample of AI-screened-out resumes for unfair patterns.",
    timeLimitMinutes: 240,
    scenario:
      "You have 80 applications for one role and need a shortlist of 8 by end of day. Walk through how you'd use AI to help screen resumes against the job requirements, what you'd deliberately keep a human eye on to avoid biased or unfair filtering, and how you'd document the decision in case it's ever questioned.",
    decisionPrompt: "Before running any resumes through AI, what's your first step?",
    decisionOptions: [
      {
        id: "write-criteria-first",
        label: "Write down the explicit, must-have criteria for the role first, then have AI score every resume against that written list.",
        quality: "strong",
        consequence: "Every screening decision traces back to a documented, written criterion. When a rejected candidate later asks why, you have a defensible, consistent answer.",
      },
      {
        id: "loose-prompt",
        label: "Ask AI to 'find the strongest candidates' from the resume batch without defining criteria first.",
        quality: "partial",
        consequence: "AI produces a shortlist that looks reasonable, but you later realize it consistently favored candidates from a small number of universities — a pattern with no written justification you'd be comfortable defending.",
      },
      {
        id: "full-auto-reject",
        label: "Let AI auto-reject the bottom 60 resumes without any human spot-check, to save time.",
        quality: "weak",
        consequence: "Weeks later, a rejected candidate raises a formal complaint. You have no record of why they were screened out and no evidence anyone reviewed the AI's decision — a real compliance exposure.",
      },
    ],
    aiOutputSample:
      "Top 8 candidates ranked by fit: Jordan M. (9 years experience, Stanford), Priya R. (8 years, MIT), ... [continues]. Candidates were deprioritized primarily for insufficient years of directly-titled experience or attending less selective universities, which tend to correlate with weaker technical preparation.",
    aiOutputIssues: [
      { id: "university-as-proxy", label: "The output uses university selectivity as a proxy for candidate quality, which is a bias risk unrelated to the actual job requirements", present: true },
      { id: "titled-experience-only", label: "The output screens on job title matching rather than actual demonstrated skills, which can unfairly filter out qualified career-changers", present: true },
      { id: "ranked-transparently", label: "The output shows its ranking and reasoning rather than a black-box yes/no, which supports human review", present: false },
      { id: "no-protected-class-signal", label: "The stated reasoning doesn't reference age, gender, name-based ethnicity inference, or other protected characteristics", present: false },
      { id: "correlation-stated-as-cause", label: "The output asserts that university selectivity 'correlates with weaker technical preparation' as if it were an established, job-relevant fact", present: true },
    ],
    expertApproach:
      "The moment AI's stated reasoning includes a factor not on your written job requirements — university prestige, a specific past job title, graduation year — treat it as a red flag requiring a human override, not a tiebreaker to accept. Spot-check a random sample of the resumes AI screened OUT, not just the ones it kept, since that's where unfair filtering hides. Document the criteria and the spot-check before the shortlist goes anywhere.",
    skills: ["evaluation", "fundamentals"],
  },
  {
    title: "Vendor Delay Contingency Simulation",
    department: "Operations",
    difficulty: "MEDIUM",
    description: "Practice using AI to model contingency options when a key supplier slips.",
    role: "Operations Planner, Northstar Consumer Group",
    objective: "Choose a contingency plan for a supplier delay using AI-assisted modeling, without committing to a plan AI can't actually verify.",
    availableTools: ["OpenAI", "Excel"],
    companyPolicy: "AI-assisted forecasts may be used for internal planning immediately, but any customer-facing shipment commitment must be confirmed by a human against actual inventory and carrier data first.",
    workflowNote: "Demand Forecasting Assistant: AI-assisted forecasting incorporates external signals and flags anomalies for planner review.",
    constraints: "You have committed shipments to customers in 10 days and a supplier delay of 3 weeks just landed.",
    successCriteria: "The contingency plan you choose is checked against real inventory and carrier data, not just AI's modeled estimate, before any customer communication goes out.",
    timeLimitMinutes: 60,
    scenario:
      "Your primary packaging supplier just notified you of a 3-week delay, and you have committed shipments in 10 days. Walk through how you'd use AI to model contingency options (alternate suppliers, partial shipments, customer communication), and what you would verify with the supplier or your team directly before committing to a plan.",
    decisionPrompt: "The delay notice just arrived. What's your first move?",
    decisionOptions: [
      {
        id: "model-then-verify",
        label: "Have AI model 2-3 contingency options (alternate supplier, partial ship, delayed ship with credit) using your real inventory numbers, then verify the most promising one directly with your backup supplier before committing.",
        quality: "strong",
        consequence: "Your backup supplier confirms they can cover 70% of volume in time. You commit to a partial-ship plan you know is real, and communicate proactively with affected customers before they have to ask.",
      },
      {
        id: "model-only",
        label: "Have AI model the contingency options and go with whichever one it ranks highest, without checking with the backup supplier first.",
        quality: "partial",
        consequence: "AI's top-ranked option assumed backup supplier capacity based on historical averages. When you finally call them, actual current capacity is 40% lower than assumed, forcing a scramble two days before the ship date.",
      },
      {
        id: "wait-and-see",
        label: "Wait to see if the original supplier can partially expedite before doing any contingency planning.",
        quality: "weak",
        consequence: "The supplier can't expedite. You've lost 4 days that could have gone toward securing a backup, and now have only 6 days to solve a problem that needed 10.",
      },
    ],
    aiOutputSample:
      "Recommended plan: Source 100% of the packaging shortfall from Backup Supplier Co., who historically has had excess capacity in Q4. This fully covers the shipment commitment with no customer impact. Estimated additional cost: $8,400.",
    aiOutputIssues: [
      { id: "capacity-assumed-not-confirmed", label: "The plan assumes 100% backup coverage based on historical Q4 patterns, without confirming current capacity with the supplier", present: true },
      { id: "no-customer-impact-claim", label: "The output claims 'no customer impact' despite the plan depending on an unconfirmed capacity assumption", present: true },
      { id: "cost-estimate-shown", label: "A specific estimated cost is shown, which is useful for planning even if it needs verification", present: false },
      { id: "single-point-of-failure", label: "The plan relies entirely on one backup supplier with no partial fallback if that supplier can't cover the full amount", present: true },
      { id: "ignores-partial-ship-option", label: "The plan doesn't consider a partial-shipment-plus-customer-credit option at all", present: false },
    ],
    expertApproach:
      "A modeled plan is a hypothesis until someone confirms it with the party who actually has to deliver on it. 'Historically has excess capacity' is not the same as 'has capacity right now' — a single phone call to the backup supplier turns an assumption into a fact before you stake a customer commitment on it. Building in a partial-ship fallback protects you if the backup can't fully cover the gap.",
    skills: ["workflowDesign", "evaluation"],
  },
  {
    title: "Feature Prioritization Simulation",
    department: "Product",
    difficulty: "MEDIUM",
    description: "Practice using AI to synthesize conflicting stakeholder input into a defensible roadmap call.",
    role: "Product Manager, Northstar Consumer Group",
    objective: "Make and justify a single-feature prioritization call between two competing stakeholder requests.",
    availableTools: ["Claude", "Notion"],
    companyPolicy: "AI may synthesize internal customer feedback and support data freely. Any AI-drafted summary shared externally or with executives must be checked against the underlying data before sending.",
    workflowNote: "AI-Assisted Product Requirement Docs: AI drafts a structured PRD from meeting notes and prior docs for PM review.",
    constraints: "Engineering has capacity for exactly one of the two requested features this quarter.",
    successCriteria: "Your recommendation cites specific, checkable data (ticket volume, deal size, customer counts) rather than whichever request was made most recently or most loudly.",
    timeLimitMinutes: 90,
    scenario:
      "Sales wants a feature to close a big deal this quarter. Support says a different fix would cut ticket volume 20%. Engineering has capacity for one, not both. Walk through how you'd use AI to synthesize the customer feedback and data behind each request, and how you'd present the trade-off and your recommendation to stakeholders.",
    decisionPrompt: "Both requests just landed in your inbox on the same day. What's your first step?",
    decisionOptions: [
      {
        id: "pull-data-both",
        label: "Pull the actual supporting data for both requests (deal size and probability for sales, ticket volume and trend for support) before asking AI to synthesize a comparison.",
        quality: "strong",
        consequence: "AI's synthesis is grounded in real numbers on both sides, and your recommendation memo withstands pushback from whichever stakeholder doesn't get prioritized this quarter.",
      },
      {
        id: "ask-ai-decide",
        label: "Describe both requests to AI in a paragraph each and ask it to recommend which one to prioritize.",
        quality: "partial",
        consequence: "AI recommends the sales feature based on the framing of your paragraph, which happened to describe the deal in more vivid terms — not because the underlying data actually favored it.",
      },
      {
        id: "pick-louder-stakeholder",
        label: "Prioritize whichever stakeholder is applying more pressure this week.",
        quality: "weak",
        consequence: "You ship the sales feature. The deal doesn't close for unrelated reasons, and support's ticket volume — which the other fix would have addressed — keeps climbing, now visible in the next QBR.",
      },
    ],
    aiOutputSample:
      "Recommendation: Prioritize the Sales-requested feature. This deal represents significant revenue and closing it would be a strong quarterly result. The Support ticket issue, while valid, affects a smaller number of customers and can likely wait another quarter without major consequence.",
    aiOutputIssues: [
      { id: "no-dollar-figure", label: "The recommendation cites 'significant revenue' without a specific deal size or win probability", present: true },
      { id: "no-ticket-volume-cited", label: "The recommendation dismisses the support issue's scale without citing actual ticket volume or trend data", present: true },
      { id: "assumes-no-consequence", label: "The output asserts the support issue 'can likely wait without major consequence' without evidence for that claim", present: true },
      { id: "acknowledges-tradeoff-exists", label: "The output at least acknowledges both requests are valid rather than dismissing one outright", present: false },
      { id: "considers-partial-fix", label: "The output explores whether a smaller, faster version of either feature could address both needs partially", present: false },
    ],
    expertApproach:
      "A recommendation that can't point to a specific number on each side of the trade-off is really just restating whichever request sounded more urgent — exactly the bias this exercise is designed to catch. Before asking AI to synthesize anything, get the deal size and probability from Sales and the ticket volume/trend from Support in writing, and require your recommendation (and AI's) to cite both explicitly.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Contract Redline Simulation",
    department: "Legal",
    difficulty: "HIGH",
    description: "Practice using AI to speed up a first-pass contract review without skipping legal judgment.",
    role: "Contracts Counsel, Northstar Consumer Group",
    objective: "Produce a first-pass redline of a vendor contract using AI, escalating what AI cannot safely decide.",
    availableTools: ["OpenAI"],
    companyPolicy: "Contracts often contain confidential terms. Only use AI tools covered by a signed data processing agreement, and never let AI's suggested redline be sent to a counterparty without a licensed attorney's review.",
    workflowNote: "Contract Review Assistant: AI flags non-standard or high-risk clauses against the company's playbook before legal review.",
    constraints: "The vendor is asking for a response by end of week, and three clauses have been materially changed from your standard terms.",
    successCriteria: "You correctly separate what AI can flag (deviation from standard language) from what requires an attorney's independent judgment (whether an unusual term is actually acceptable risk).",
    timeLimitMinutes: 90,
    scenario:
      "A vendor sent back a services agreement with several clauses changed, including limitation of liability and data handling terms. Walk through how you'd use AI to do a first-pass comparison against your standard terms and draft suggested redlines, and specifically what you would never let AI decide on its own before it reaches a licensed attorney's review.",
    decisionPrompt: "You've just received the redlined contract back from the vendor. What's your first step?",
    decisionOptions: [
      {
        id: "ai-flag-attorney-decide",
        label: "Have AI compare every clause against your standard playbook and flag deviations, but treat every flagged clause as a question for an attorney to decide, not AI.",
        quality: "strong",
        consequence: "AI catches all three changed clauses in minutes, including one subtle change you might have skimmed past. An attorney reviews the flagged set and makes the actual risk calls — the process is fast and still sound.",
      },
      {
        id: "accept-ai-redline",
        label: "Have AI suggest specific redline language for each changed clause and send its suggestions back to the vendor directly to save a review cycle.",
        quality: "partial",
        consequence: "AI's suggested liability cap language is reasonable-sounding but sets a number inconsistent with your company's actual risk tolerance for vendors this size — an attorney would have caught this immediately, but it went out unreviewed.",
      },
      {
        id: "skim-manually",
        label: "Skim the contract yourself for anything that looks different, since you're familiar with the standard terms.",
        quality: "weak",
        consequence: "You catch two of the three changes. The third — a subtle change to the data handling clause buried in a longer paragraph — goes unnoticed and is only caught in a later audit.",
      },
    ],
    aiOutputSample:
      "Section 8 (Limitation of Liability) has been modified to remove the mutual cap and instead cap only the vendor's liability at $50,000. Section 12 (Data Handling) now permits the vendor to use aggregated customer data for their own product improvement. Recommended action: Accept the liability change since $50,000 is a reasonable floor, and accept the data handling change since it's aggregated, not identifiable, data.",
    aiOutputIssues: [
      { id: "correctly-identifies-changes", label: "The output correctly identifies both clauses that were actually changed from standard terms", present: false },
      { id: "makes-risk-judgment", label: "The output makes an affirmative recommendation ('accept') on a liability and data term rather than only flagging the deviation for attorney review", present: true },
      { id: "no-basis-for-reasonable", label: "The output calls $50,000 'a reasonable floor' without reference to this company's actual risk tolerance or deal size", present: true },
      { id: "data-handling-oversimplified", label: "The output treats 'aggregated data' as automatically low-risk without considering re-identification risk or the company's own data policies", present: true },
      { id: "flags-both-for-review", label: "The output flags both clauses as needing review rather than silently accepting either", present: false },
    ],
    expertApproach:
      "AI is well-suited to the mechanical part of this task — comparing clause language against a playbook and catching deviations a tired human eye might miss. It is not suited to deciding whether $50,000 is an acceptable liability cap or whether 'aggregated' data handling is actually safe for this company — those are judgment calls informed by risk tolerance, deal history, and legal exposure that belong to a licensed attorney. Use AI to build the list of what changed; never let it also answer whether the change is acceptable.",
    skills: ["evaluation", "fundamentals"],
  },
  {
    title: "Board Update Simulation",
    department: "Executive",
    difficulty: "MEDIUM",
    description: "Practice using AI to turn scattered team updates into a tight, accurate board memo.",
    role: "VP of Operations, Northstar Consumer Group",
    objective: "Synthesize five separate team updates into an accurate one-page board memo using AI.",
    availableTools: ["Claude", "Notion"],
    companyPolicy: "AI may draft internal synthesis freely. Any figure that will appear in a board-facing document must be verified against its source system before the memo is finalized.",
    workflowNote: "AI-Assisted Board Reporting: AI drafts a first-pass board narrative from department metrics, executives edit and finalize.",
    constraints: "The board memo is due in 2 hours, and your source material is five inconsistent Slack updates and a rough spreadsheet.",
    successCriteria: "Every figure that appears in the final memo is one you've personally verified against its source, not one AI selected from ambiguous inputs.",
    timeLimitMinutes: 120,
    scenario:
      "You have five separate Slack updates and a rough metrics spreadsheet from your team leads, and a board memo is due in 2 hours. Walk through how you'd use AI to synthesize this into a one-page update, and what facts and figures you would personally verify before it goes to the board.",
    decisionPrompt: "You have the five Slack updates open. What's your first move?",
    decisionOptions: [
      {
        id: "synthesize-then-check-numbers",
        label: "Have AI draft the synthesis first, then personally trace every number in the draft back to its source update or spreadsheet cell before finalizing.",
        quality: "strong",
        consequence: "You find and fix one figure AI misread from an ambiguous Slack message, and the memo goes to the board with every number personally verified.",
      },
      {
        id: "synthesize-and-trust",
        label: "Have AI draft the synthesis and do a quick read-through for tone before sending.",
        quality: "partial",
        consequence: "The memo reads well, but a growth percentage AI calculated from two different team leads' inconsistent reporting periods is technically wrong. A board member catches the math in the meeting.",
      },
      {
        id: "write-manually",
        label: "Skip AI entirely and write the memo manually from the five updates to be safe.",
        quality: "weak",
        consequence: "Reading and reconciling five inconsistent updates manually takes 90 of your 120 minutes, leaving almost no time to actually verify the numbers you did include.",
      },
    ],
    aiOutputSample:
      "Operations delivered a strong quarter: fulfillment accuracy improved to 98.5%, customer satisfaction rose 12% quarter-over-quarter, and the new automation initiative saved an estimated 400 hours this month. The team is on track to exceed all Q4 targets.",
    aiOutputIssues: [
      { id: "csat-period-mismatch", label: "The 12% CSAT increase compares two updates that actually covered different time periods, which the draft doesn't flag", present: true },
      { id: "hours-saved-unsourced", label: "The '400 hours saved' figure doesn't trace back to any specific number in the five source updates", present: true },
      { id: "fulfillment-figure-real", label: "The 98.5% fulfillment accuracy figure matches exactly what one team lead reported", present: false },
      { id: "overreaching-conclusion", label: "'On track to exceed all Q4 targets' is a broader claim than any individual update actually supports", present: true },
      { id: "reads-as-confident", label: "The memo reads confidently and is well-organized for a board audience", present: false },
    ],
    expertApproach:
      "AI is genuinely good at turning five messy updates into one coherent narrative — that's real time saved. But 'coherent' can quietly paper over a mismatched comparison period or a rounded-up figure with no real source, and a board memo is exactly the wrong place for that to slip through. Trace every number back to its source line before it's final; don't just read the synthesis for tone and assume the math survived the transformation.",
    skills: ["evaluation", "automation"],
  },
  {
    title: "Incident Postmortem Simulation",
    department: "Engineering",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft an incident timeline and root-cause writeup without guessing at facts.",
    role: "Senior Software Engineer, Northstar Consumer Group",
    objective: "Draft an accurate incident postmortem using AI, without letting it fill timeline gaps with plausible-sounding guesses.",
    availableTools: ["OpenAI", "Jira"],
    companyPolicy: "AI-assisted postmortems must cite an actual log timestamp, metric, or transcript line for every factual claim in the timeline — no unsourced statements in a published postmortem.",
    workflowNote: "AI Code Review Assistant: AI reviews the diff first for bugs, style, and missing tests, then a human reviewer focuses on design.",
    constraints: "You have scattered log excerpts, a Slack incident channel transcript, and your own memory of a 40-minute outage from last night.",
    successCriteria: "Every timestamp and causal claim in the final postmortem is backed by an actual log line or transcript message, not AI's inference about what 'probably' happened.",
    timeLimitMinutes: 60,
    scenario:
      "A production outage lasted 40 minutes last night. You have scattered log excerpts, a Slack incident channel transcript, and your own memory of what happened. Walk through how you'd use AI to draft the postmortem timeline and root-cause summary, and what you would cross-check against actual logs before publishing it.",
    decisionPrompt: "You're about to ask AI to draft the timeline. What do you feed it?",
    decisionOptions: [
      {
        id: "raw-sources-only",
        label: "Feed AI the raw log excerpts and Slack transcript only, and ask it to build a timeline strictly from timestamps present in that material — flagging any gap rather than filling it.",
        quality: "strong",
        consequence: "The draft timeline correctly leaves a 6-minute gap marked 'unaccounted for' instead of guessing, which prompts you to check a log source you'd forgotten about — closing the real gap with a real fact.",
      },
      {
        id: "fill-from-memory",
        label: "Feed AI the logs and transcript, plus your own recollection of the sequence of events, and ask it to produce one smooth narrative.",
        quality: "partial",
        consequence: "The postmortem reads cleanly, but your memory of the exact minute mitigation started was off by several minutes — a detail no one catches until someone cross-references the deploy log weeks later.",
      },
      {
        id: "ask-for-root-cause-directly",
        label: "Ask AI to determine the root cause directly from a general description of the symptoms, without providing the actual logs.",
        quality: "weak",
        consequence: "AI produces a plausible root cause based on common failure patterns for this type of symptom, which turns out to be entirely wrong — the real cause was specific to this system and only visible in the actual logs.",
      },
    ],
    aiOutputSample:
      "Timeline: 11:02pm - Error rate begins climbing, likely due to a recent deploy. 11:04pm - On-call engineer is paged. 11:15pm - Root cause identified as a database connection pool exhaustion. 11:38pm - Fix deployed and error rate returns to normal. Root cause: A recent code change failed to release database connections under high load.",
    aiOutputIssues: [
      { id: "likely-due-to-deploy", label: "The 11:02pm entry attributes the error spike to a recent deploy using the word 'likely' without citing the deploy timestamp for comparison", present: true },
      { id: "root-cause-time-unsourced", label: "The claim that root cause was 'identified' at 11:15pm isn't tied to a specific transcript message or log line", present: true },
      { id: "page-time-matches-logs", label: "The 11:04pm page time matches an actual PagerDuty log entry", present: false },
      { id: "root-cause-specific-and-checkable", label: "The stated root cause (connection pool exhaustion from a code change) is specific enough to verify against the actual code diff", present: false },
      { id: "gap-not-flagged", label: "There's an 11-minute gap between paging and root cause identification with no detail on what happened during it, and the draft doesn't flag this as a gap", present: true },
    ],
    expertApproach:
      "A postmortem's value comes entirely from being trustworthy months later when someone relies on it to avoid the same failure — a single ungrounded 'likely due to' claim undermines that. Require AI to cite the specific log line or transcript timestamp behind every claim, and treat any point where the story feels smooth-but-vague as a sign it's guessing, not reporting. An honest gap ('root cause unclear from 11:04-11:15') is more valuable than a confident-sounding guess.",
    skills: ["evaluation", "automation"],
  },
];
