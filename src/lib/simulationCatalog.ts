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
    title: "Claims Document Review Simulation",
    department: "Claims",
    difficulty: "MEDIUM",
    description: "Practice using AI to extract and summarize information from a claim file without inventing facts.",
    role: "Claims Adjuster, Havenbrook",
    objective: "Summarize a new auto claim file for your supervisor, using AI to accelerate document review without introducing errors.",
    availableTools: ["ChatGPT", "Claims Portal"],
    companyPolicy: "Claim documents may contain the policyholder's medical and financial details. Only paste document text into AI tools covered by Havenbrook's data processing agreement (the Claims Portal's built-in assistant), never into a personal or unapproved AI account.",
    workflowNote: "AI-Assisted Claims Document Processing: AI extracts key facts from claim documents, drafts a structured summary, and flags missing information for adjuster review.",
    constraints: "The claim file includes a police report, two repair estimates, and a recorded statement transcript - about 40 pages combined. Your supervisor needs a summary before a 2pm case review.",
    successCriteria: "The summary includes only facts that are actually stated in the source documents, clearly flags anything missing or contradictory, and states the estimate range instead of picking one number arbitrarily.",
    timeLimitMinutes: 45,
    scenario:
      "You've just received a new auto claim file: a police report, two repair estimates that differ by $1,800, and a recorded statement transcript. Explain how you'd use AI to build the case summary, what you'd flag as needing your own judgment, and what you'd verify before it goes to your supervisor.",
    decisionPrompt: "You open the 40-page claim file. What's your first move?",
    decisionOptions: [
      {
        id: "extract-then-verify",
        label: "Feed the actual documents to the Claims Portal assistant and ask it to extract key facts and flag anything missing or contradictory, then verify each flagged item yourself.",
        quality: "strong",
        consequence: "The assistant flags the $1,800 estimate discrepancy and a missing VIN confirmation. You resolve both before the 2pm review, and your supervisor doesn't have to send it back for corrections.",
      },
      {
        id: "summarize-only",
        label: "Ask AI for a general one-paragraph summary of the claim without asking it to flag discrepancies.",
        quality: "partial",
        consequence: "The summary reads well but doesn't surface the $1,800 estimate gap. Your supervisor catches it in the review meeting, and you have to explain why it wasn't flagged.",
      },
      {
        id: "skip-ai",
        label: "Skip AI and manually read all 40 pages yourself to be safe.",
        quality: "weak",
        consequence: "You spend most of your morning on one file and arrive at the 2pm review having only gotten through half your queue for the day.",
      },
    ],
    aiOutputSample:
      "Claim Summary: Auto collision on 3/14. Police report confirms the other driver ran a red light. Repair estimate: $6,200. Policyholder's recorded statement is consistent with the police report. Recommend approval for the full repair amount.",
    aiOutputIssues: [
      { id: "single-estimate-cited", label: "The summary cites only one repair estimate ($6,200) when the file actually contains two that differ by $1,800", present: true },
      { id: "recommends-approval", label: "The summary recommends approving the full amount, a decision that belongs to the adjuster, not the AI draft", present: true },
      { id: "cites-police-report-fact", label: "The claim that the police report confirms the other driver ran a red light is a real, checkable fact from that document", present: false },
      { id: "statement-consistency-checked", label: "The summary states the recorded statement is 'consistent' with the police report without noting what was actually compared", present: true },
      { id: "no-vin-check", label: "The summary doesn't mention whether the VIN on the estimates matches the insured vehicle", present: false },
    ],
    expertApproach:
      "AI is genuinely useful for pulling facts out of a stack of documents quickly, but it should never be the one deciding what to approve, and it shouldn't silently pick one number when the file has two conflicting ones. Always ask it to flag discrepancies explicitly rather than just summarize, and treat any approval recommendation in an AI draft as something you cut before it goes further.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Underwriting Risk Research Simulation",
    department: "Underwriting",
    difficulty: "MEDIUM",
    description: "Practice using AI to research a commercial policy applicant without overstating what the research actually shows.",
    role: "Underwriter, Havenbrook",
    objective: "Build a risk profile for a new commercial insurance applicant using AI-assisted research, ahead of a pricing decision.",
    availableTools: ["ChatGPT", "Power BI"],
    companyPolicy: "Only publicly available business information may be researched with the general AI tool. Applicant-submitted financial statements and loss history stay inside internal systems.",
    workflowNote: "AI-Assisted Underwriting Research: AI gathers public risk signals about an applicant and drafts a summary; the underwriter verifies and makes the pricing decision.",
    constraints: "You have a pricing decision due tomorrow and the applicant's public footprint is limited to a company website and a few news mentions.",
    successCriteria: "Every risk factor in your final write-up is either confirmed from a real source or explicitly marked as unconfirmed - never stated as fact because it sounded plausible.",
    timeLimitMinutes: 60,
    scenario:
      "A mid-size contracting business has applied for a commercial policy. Walk through how you'd use AI to research their public risk profile (safety record, litigation history, financial stability signals), and what you would verify against internal or third-party data before it factors into pricing.",
    decisionPrompt: "You start researching the applicant. What's your approach?",
    decisionOptions: [
      {
        id: "research-then-crosscheck",
        label: "Have AI compile public signals (news, safety citations, litigation records) with sources cited, then cross-check each cited source yourself before including it in the risk profile.",
        quality: "strong",
        consequence: "You catch that one 'safety citation' AI found was actually about a different company with a similar name. Your final risk profile is accurate and defensible.",
      },
      {
        id: "research-no-check",
        label: "Have AI compile the same research and include it in your risk profile as written.",
        quality: "partial",
        consequence: "The mismatched-company safety citation makes it into your pricing rationale. It's caught in a later audit, and the file has to be re-priced.",
      },
      {
        id: "skip-public-research",
        label: "Skip public research and price based only on the applicant's submitted financials, since that's the official source.",
        quality: "weak",
        consequence: "You miss a pattern of safety violations that was publicly reported and directly relevant to this class of risk - information a thorough review would have caught.",
      },
    ],
    aiOutputSample:
      "Risk profile: ABC Contracting has no reported safety violations in the past 5 years. The company appears financially stable based on steady headcount growth reported in local news. One minor lawsuit was found regarding a payment dispute, considered low risk.",
    aiOutputIssues: [
      { id: "absence-not-verified", label: "'No reported safety violations' is stated as a finding, but absence of search results isn't the same as a confirmed clean record from the actual regulatory database", present: true },
      { id: "headcount-as-financial-proxy", label: "Headcount growth from a news mention is used as a proxy for financial stability without checking actual financial signals", present: true },
      { id: "lawsuit-labeled-low-risk", label: "The lawsuit is labeled 'low risk' without stating what about it makes it low risk", present: true },
      { id: "lawsuit-disclosed", label: "The output at least surfaces the lawsuit rather than omitting it", present: false },
      { id: "cites-specific-source", label: "The safety violation claim cites the specific regulatory database checked", present: false },
    ],
    expertApproach:
      "The gap between 'AI didn't find evidence of X' and 'X is confirmed not to exist' matters enormously in underwriting - always check the actual regulatory or court database directly for anything that will affect pricing, rather than treating a clean AI search as a clean record. Any risk characterization ('low risk', 'stable') needs a stated reason you can defend, not just a plausible-sounding label.",
    skills: ["evaluation", "prompting"],
  },
  {
    title: "Policyholder Inquiry Response Simulation",
    department: "Customer Service",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft a response to a frustrated policyholder without overpromising on coverage.",
    role: "Customer Service Representative, Havenbrook",
    objective: "Respond to a policyholder disputing a claim denial, using AI to draft a clear, accurate explanation.",
    availableTools: ["Claude", "Claims Portal"],
    companyPolicy: "Never state or imply a coverage decision has changed unless it has actually been reviewed and approved by claims. Reference the policy's actual terms, not a general description of what policies 'usually' cover.",
    workflowNote: "AI-Assisted Policy & Claims Inquiry Response: AI drafts a response referencing the policyholder's actual policy terms and claim status, flagged for verification before sending.",
    constraints: "The policyholder has called twice and emailed once about a water damage claim that was denied for a coverage exclusion. They are threatening to file a complaint with the state insurance department.",
    successCriteria: "The response accurately reflects the actual exclusion in their policy, acknowledges their frustration, and clearly explains the appeal process rather than implying a reversal.",
    timeLimitMinutes: 20,
    scenario:
      "A policyholder's water damage claim was denied under a gradual-damage exclusion, and they've contacted you three times, now threatening to file a state complaint. Walk through how you'd use AI to draft a response, what you'd verify in their actual policy before sending it, and when you'd escalate instead of responding yourself.",
    decisionPrompt: "You pull up the ticket. What's your first move?",
    decisionOptions: [
      {
        id: "verify-policy-first",
        label: "Pull the policyholder's actual policy language and the claims adjuster's denial notes before drafting anything.",
        quality: "strong",
        consequence: "You confirm the exclusion was applied correctly and can explain the specific policy section in your response - and also find the appeal process the policyholder wasn't told about, which is exactly what they need.",
      },
      {
        id: "draft-generic-then-check",
        label: "Ask AI to draft an empathetic explanation of coverage exclusions in general, then check the specifics afterward.",
        quality: "partial",
        consequence: "The draft is warm but generic, and doesn't reference their specific exclusion or the appeal process. You have to substantially rewrite it, losing the time you meant to save.",
      },
      {
        id: "escalate-immediately",
        label: "Escalate to a manager immediately without attempting a response, since the policyholder is upset.",
        quality: "weak",
        consequence: "The manager sends it right back to you since this is a standard denial-explanation case within your authority, and the policyholder waits another day for a response.",
      },
    ],
    aiOutputSample:
      "I understand your frustration and I'm sorry for the trouble. After further review, we've decided to cover your water damage claim in full. You should see payment within 5-7 business days. Please let us know if you have questions!",
    aiOutputIssues: [
      { id: "false-reversal", label: "The draft states the claim will now be covered in full, but no such reversal was actually reviewed or approved", present: true },
      { id: "payment-timeline-invented", label: "A specific payment timeline is given for a payment that isn't happening", present: true },
      { id: "warm-opening", label: "The empathetic opening acknowledging frustration is appropriate for this situation", present: false },
      { id: "no-appeal-process-mentioned", label: "The draft doesn't mention the actual appeal process available to the policyholder", present: true },
      { id: "references-actual-exclusion", label: "The draft explains the specific gradual-damage exclusion that applies to this claim", present: false },
    ],
    expertApproach:
      "Never let a draft state that a coverage decision changed unless it actually did - that's not a communication style choice, it's a false promise that creates real liability. Keep AI's empathetic tone, but replace any invented outcome with the real facts: the specific exclusion that applied, and the actual appeal process, which is usually the most helpful thing you can offer someone in this position.",
    skills: ["evaluation", "prompting"],
  },
  {
    title: "Insurance Sales Prospecting Simulation",
    department: "Sales",
    difficulty: "MEDIUM",
    description: "Practice using AI to prioritize and research inbound commercial insurance leads under time pressure.",
    role: "Insurance Sales Agent, Havenbrook",
    objective: "Decide which inbound leads deserve immediate outreach today, and how AI should support that outreach.",
    availableTools: ["ChatGPT", "Salesforce"],
    companyPolicy: "Only publicly available business information may be pasted into ChatGPT. Never paste a prospect's submitted financial documents or loss history into any AI tool.",
    workflowNote: "AI-Assisted Insurance Sales Prospecting: AI researches the prospect's business and industry risk profile, drafts personalized outreach, and pre-fills CRM fields for agent approval.",
    constraints: "You have 12 inbound quote requests from overnight and a call scheduled in 30 minutes.",
    successCriteria: "You prioritize leads using explicit criteria (business size, industry risk fit, renewal timing) rather than gut feel, and keep a human check before anything goes to a prospect.",
    timeLimitMinutes: 30,
    scenario:
      "You have 12 inbound commercial insurance quote requests from overnight and a call in 30 minutes. Explain how you'd use AI to research and prioritize outreach for the leads you selected, and what you'd verify before contacting them.",
    decisionPrompt: "It's 8:45am. You have 12 new leads and a call at 9:15. What do you do first?",
    decisionOptions: [
      {
        id: "criteria-first",
        label: "Quickly score all 12 leads against business size and industry risk fit, then have AI research only the top 3.",
        quality: "strong",
        consequence: "You identify the top 3 best-fit leads in 6 minutes and have AI-researched, personalized outreach drafted for all 3 before your call, with time to spare for review.",
      },
      {
        id: "first-come",
        label: "Start researching leads in the order they arrived, since the first ones came in earliest.",
        quality: "partial",
        consequence: "You research 4 leads thoroughly, but two turn out to be poor risk fits for Havenbrook's appetite - you run out of time before reaching the strongest lead in the batch.",
      },
      {
        id: "ai-blast",
        label: "Have AI draft outreach for all 12 leads at once and send them without individual review to save time.",
        quality: "weak",
        consequence: "AI invents a plausible-sounding but incorrect detail about one prospect's business size. It goes out unreviewed, and the prospect replies pointing out the error before the relationship even starts.",
      },
    ],
    aiOutputSample:
      "Riverside Logistics is a 60-employee trucking company based in Dallas. They appear to have grown significantly this year based on job postings, and recently opened a second location. This looks like a strong-fit lead for our commercial auto and general liability bundle given their growth trajectory.",
    aiOutputIssues: [
      { id: "employee-count-unsourced", label: "The 60-employee figure is stated as fact with no source given", present: true },
      { id: "job-postings-as-proxy", label: "Job posting volume is used as a proxy for company growth without a stated basis", present: true },
      { id: "second-location-checkable", label: "The second-location claim is presented as a specific, checkable fact from a public source", present: false },
      { id: "overconfident-fit", label: "The output states this 'looks like a strong-fit lead' as a suggestion to verify, not a guaranteed close", present: false },
      { id: "recommends-unverified-bundle", label: "It recommends a specific product bundle based entirely on unverified size/growth signals", present: true },
    ],
    expertApproach:
      "Treat AI research as a hypothesis, not a source of record: verify employee count and growth claims against a real source (their website, D&B, LinkedIn) before they shape which product you pitch or how you price the conversation. Time-box research to your top-scored leads only, since spreading AI research evenly across 12 leads guarantees shallow, unverified output on all of them.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Campaign Brief Simulation",
    department: "Marketing",
    difficulty: "LOW",
    description: "Practice turning a vague campaign request into a structured, AI-assisted brief.",
    role: "Marketing Manager, Havenbrook",
    objective: "Turn a one-line executive request into a structured campaign brief using AI, without losing the strategic details only you know.",
    availableTools: ["Claude", "Microsoft 365"],
    companyPolicy: "Draft campaign copy may use AI freely. Any claim about coverage, pricing, or availability must be verified against current product and compliance guidelines before publishing.",
    workflowNote: "AI-Generated Campaign Briefs & Copy Drafts: AI drafts a campaign brief and channel-specific copy variants from a single input brief for marketer review.",
    constraints: "The VP gave you one sentence of direction and is not available for follow-up questions until tomorrow.",
    successCriteria: "The brief AI produces reflects real constraints (budget, audience, compliance guardrails) you supply, not generic assumptions AI fills in on its own.",
    timeLimitMinutes: 20,
    scenario:
      "Your VP says: 'We need something to drive awareness for our new small-business insurance bundle before renewal season.' Walk through how you'd use AI to turn this into a structured campaign brief, including audience, channels, and key message.",
    decisionPrompt: "Before asking AI to draft the brief, what do you do?",
    decisionOptions: [
      {
        id: "supply-context",
        label: "Write out what you actually know: target audience, budget ballpark, renewal-season timeline, and prior campaign performance. Then ask AI to structure it into a brief.",
        quality: "strong",
        consequence: "The brief AI produces reflects your team's real constraints and reads like something your VP would recognize.",
      },
      {
        id: "one-liner-prompt",
        label: "Paste the VP's one sentence directly into AI and ask for a full campaign brief.",
        quality: "partial",
        consequence: "AI produces a polished-looking brief, but it invents a generic small-business audience that doesn't match Havenbrook's actual target segment - you have to redo the audience section from scratch.",
      },
      {
        id: "skip-brief",
        label: "Skip the brief and go straight to asking AI for social copy, since that's what will ship fastest.",
        quality: "weak",
        consequence: "The copy looks fine in isolation, but without an agreed brief and compliance review, it implies a coverage guarantee that legal later has to pull down.",
      },
    ],
    aiOutputSample:
      "Campaign Brief: Small Business Insurance Awareness\nAudience: All small business owners nationwide.\nBudget: $75,000 recommended based on typical renewal campaigns.\nChannels: Email, social media, and paid search.\nKey message: 'Complete protection for your business, guaranteed.'",
    aiOutputIssues: [
      { id: "generic-audience", label: "The audience is defined so broadly ('all small business owners nationwide') that it isn't actionable for targeting or compliant with state-specific licensing", present: true },
      { id: "invented-budget", label: "The budget figure is presented as a recommendation but has no basis in Havenbrook's actual marketing spend", present: true },
      { id: "guarantee-language", label: "'Guaranteed' protection is a compliance risk for an insurance product - coverage always has terms and exclusions", present: true },
      { id: "channels-reasonable", label: "The suggested channels are a reasonable generic starting point to react to, not a factual claim", present: false },
      { id: "fabricates-past-performance", label: "The brief cites specific results from a past campaign that never happened", present: false },
    ],
    expertApproach:
      "A one-sentence prompt with no real constraints will always produce a brief that sounds plausible but fits no one's actual budget, audience, or compliance requirements - and 'guaranteed' is a word that should never survive an insurance marketing draft unedited. Before drafting, supply AI with the 2-3 concrete facts only you have, and always route coverage-adjacent language through compliance before it ships.",
    skills: ["prompting", "fundamentals"],
  },
  {
    title: "Financial Reporting Narrative Simulation",
    department: "Finance",
    difficulty: "MEDIUM",
    description: "Practice using AI to explain a loss-ratio variance without overstating certainty.",
    role: "Financial Analyst, Havenbrook",
    objective: "Draft an accurate variance explanation for leadership using AI, without asserting causes you haven't confirmed.",
    availableTools: ["ChatGPT", "Power BI"],
    companyPolicy: "Only aggregated, line-of-business-level figures may be used with the general-purpose AI tool. Individual claim or policyholder detail stays inside internal systems.",
    workflowNote: "AI-Assisted Financial Reporting Narratives: AI drafts the narrative and variance commentary directly from the numbers; analysts review and finalize.",
    constraints: "The commercial auto line's loss ratio is up 9 points this quarter, and the explanation memo is due to leadership tomorrow morning.",
    successCriteria: "Every causal claim in the final memo is either confirmed with the claims or underwriting team, or explicitly marked as still under investigation.",
    timeLimitMinutes: 45,
    scenario:
      "The commercial auto line's loss ratio rose 9 points this quarter with no single obvious cause. Leadership wants an explanation memo by tomorrow morning. Walk through how you'd use AI to draft the variance explanation, which numbers you'd verify against the claims system before including them, and what you'd flag as still uncertain.",
    decisionPrompt: "You have the loss-ratio numbers but no confirmed explanation yet. What's your next step?",
    decisionOptions: [
      {
        id: "flag-then-draft",
        label: "Message claims and underwriting leads now for likely drivers, and have AI draft the memo with placeholders for anything unconfirmed by morning.",
        quality: "strong",
        consequence: "Claims confirms a cluster of large weather-related losses by end of day; the memo clearly flags a smaller unexplained portion as still under review - an honest, defensible document.",
      },
      {
        id: "ai-infer-cause",
        label: "Ask AI to infer likely causes directly from the loss-ratio numbers and historical patterns.",
        quality: "partial",
        consequence: "AI produces a plausible-sounding explanation that reads well, but it's wrong - the real driver was a handful of large claims, not the broad frequency increase AI inferred. Leadership makes a follow-up decision based on the wrong assumption.",
      },
      {
        id: "wait-for-all",
        label: "Wait until you have a fully confirmed explanation from every team before drafting anything.",
        quality: "weak",
        consequence: "Underwriting doesn't respond until after your deadline. You miss the leadership meeting with nothing to show, when a partial-but-honest memo would have been enough.",
      },
    ],
    aiOutputSample:
      "The commercial auto loss ratio increase is primarily due to rising claim frequency across the book, a trend consistent with broader industry patterns this year. This suggests a need for rate action across the full line.",
    aiOutputIssues: [
      { id: "frequency-stated-as-fact", label: "'Rising claim frequency across the book' is stated as the cause without checking whether it's actually frequency or a few large-severity claims driving the number", present: true },
      { id: "industry-pattern-unsourced", label: "The claim about 'broader industry patterns' has no cited source", present: true },
      { id: "recommends-rate-action", label: "The draft recommends a specific business action (rate action across the full line) based on an unconfirmed cause", present: true },
      { id: "acknowledges-uncertainty", label: "The draft appropriately hedges its claims with words like 'appears' or 'preliminary'", present: false },
      { id: "quarter-scope-clear", label: "The output is clear about which quarter and line of business it's describing", present: false },
    ],
    expertApproach:
      "AI can pattern-match a plausible cause from a number, but 'frequency' and 'severity' produce very different loss-ratio shapes, and the difference matters for what leadership does next - verify which one actually happened against the claims data before it's stated as fact. Never let a business recommendation (like a rate action) ride along with an unconfirmed cause.",
    skills: ["evaluation", "workflowDesign"],
  },
  {
    title: "Internal Knowledge Assistant Simulation",
    department: "Operations",
    difficulty: "LOW",
    description: "Practice using AI to answer an internal procedure question from source documents, without guessing at policy.",
    role: "Operations Coordinator, Havenbrook",
    objective: "Answer a colleague's question about an internal claims-handling procedure using AI grounded in the actual SOP documents.",
    availableTools: ["Claude", "Microsoft 365"],
    companyPolicy: "AI-assisted procedure answers must cite the specific internal SOP section they came from. Never let AI answer a compliance-sensitive procedure question from general knowledge instead of Havenbrook's actual documented policy.",
    workflowNote: "Internal Knowledge Management Assistant: AI answers internal procedure questions by searching approved internal documentation and citing the source section.",
    constraints: "A new claims processor asks you a procedural question you're not 100% sure about yourself, and needs an answer before end of day.",
    successCriteria: "The answer traces back to an actual SOP section, and anything genuinely ambiguous in the documentation is flagged rather than guessed at.",
    timeLimitMinutes: 20,
    scenario:
      "A new claims processor asks you how to handle a claim where the policyholder can't be reached after three attempts. You're not fully sure of the current SOP yourself. Walk through how you'd use AI to find and confirm the actual procedure, and what you'd do if the documentation doesn't clearly answer the question.",
    decisionPrompt: "You're not sure of the exact procedure yourself. What do you do?",
    decisionOptions: [
      {
        id: "search-cite-confirm",
        label: "Ask AI to search the actual internal SOP documents and cite the specific section, then confirm that section still reflects current policy before answering.",
        quality: "strong",
        consequence: "AI finds the relevant SOP section, but it's from a version two updates old. You catch this because you checked the citation, and give the new processor the correct, current answer.",
      },
      {
        id: "search-no-confirm",
        label: "Ask AI to search the SOPs and pass along its answer as given.",
        quality: "partial",
        consequence: "The new processor follows the outdated procedure AI cited, which creates a real process error caught a week later during a quality audit.",
      },
      {
        id: "answer-from-memory",
        label: "Answer from your own general understanding of how these situations are usually handled, without checking the SOP.",
        quality: "weak",
        consequence: "Your general understanding turns out to be from a prior employer's process, not Havenbrook's actual policy - the new processor is now trained incorrectly.",
      },
    ],
    aiOutputSample:
      "Per the Claims Handling SOP, section 4.2: after two unsuccessful contact attempts, send a certified letter and close the claim as unresponsive after 30 days.",
    aiOutputIssues: [
      { id: "cites-specific-section", label: "The answer cites a specific SOP section, which is good practice and lets you verify it", present: false },
      { id: "attempt-count-mismatch", label: "The SOP citation says 'two unsuccessful contact attempts' but the question specifically involved three attempts already made, a detail the answer doesn't address", present: true },
      { id: "no-version-check", label: "There's no indication whether this SOP section reflects the current policy version or an older one", present: true },
      { id: "actionable-format", label: "The answer is specific and actionable rather than vague", present: false },
      { id: "certified-letter-detail-real", label: "The certified letter requirement is presented as a specific, checkable procedural detail", present: false },
    ],
    expertApproach:
      "A cited source is only as good as its currency - always check that the SOP section AI found is the current version, especially for anything that touches compliance-sensitive claims handling. And read the cited answer against the actual details of the question asked; a close-but-not-quite match (two attempts vs. three) is exactly the kind of gap that creates real process errors.",
    skills: ["evaluation", "automation"],
  },
  {
    title: "Job Description & Screening Simulation",
    department: "HR",
    difficulty: "HIGH",
    description: "Practice using AI to speed up resume screening while avoiding bias and unfair rejections.",
    role: "Talent Acquisition Partner, Havenbrook",
    objective: "Produce a defensible shortlist of candidates for a claims adjuster opening using AI screening support.",
    availableTools: ["ChatGPT", "Microsoft 365"],
    companyPolicy: "AI may assist with screening against explicit, written job requirements only. AI must never be the sole basis for rejecting a candidate, and screening criteria must be documented in case of an audit.",
    workflowNote: "AI-Assisted Job Descriptions & Resume Screening: AI drafts job descriptions and pre-screens resumes against role criteria for recruiter review.",
    constraints: "You have 60 applications for one claims adjuster role and need a shortlist of 6 by end of day.",
    successCriteria: "The screening criteria are explicit and written down before screening starts, and you personally spot-check a sample of AI-screened-out resumes for unfair patterns.",
    timeLimitMinutes: 240,
    scenario:
      "You have 60 applications for one claims adjuster role and need a shortlist of 6 by end of day. Walk through how you'd use AI to help screen resumes against the job requirements, what you'd deliberately keep a human eye on to avoid biased or unfair filtering, and how you'd document the decision in case it's ever questioned.",
    decisionPrompt: "Before running any resumes through AI, what's your first step?",
    decisionOptions: [
      {
        id: "write-criteria-first",
        label: "Write down the explicit, must-have criteria for the claims adjuster role first, then have AI score every resume against that written list.",
        quality: "strong",
        consequence: "Every screening decision traces back to a documented, written criterion. When a rejected candidate later asks why, you have a defensible, consistent answer.",
      },
      {
        id: "loose-prompt",
        label: "Ask AI to 'find the strongest candidates' from the resume batch without defining criteria first.",
        quality: "partial",
        consequence: "AI produces a shortlist that looks reasonable, but you later realize it consistently favored candidates with prior big-carrier claims experience over equally qualified candidates from smaller shops - a pattern with no written justification you'd be comfortable defending.",
      },
      {
        id: "full-auto-reject",
        label: "Let AI auto-reject the bottom 50 resumes without any human spot-check, to save time.",
        quality: "weak",
        consequence: "Weeks later, a rejected candidate raises a formal complaint. You have no record of why they were screened out and no evidence anyone reviewed the AI's decision - a real compliance exposure.",
      },
    ],
    aiOutputSample:
      "Top 6 candidates ranked by fit: Jordan M. (5 years claims experience, State Farm), Priya R. (4 years, Allstate)... [continues]. Candidates were deprioritized primarily for lacking experience at a large national carrier, which tends to correlate with more standardized claims training.",
    aiOutputIssues: [
      { id: "large-carrier-as-proxy", label: "The output uses 'large national carrier' experience as a proxy for quality, which is a bias risk unrelated to Havenbrook's actual written job requirements", present: true },
      { id: "correlation-stated-as-fact", label: "The output asserts that large-carrier experience 'correlates with more standardized training' as if it were an established, job-relevant fact", present: true },
      { id: "ranked-transparently", label: "The output shows its ranking and reasoning rather than a black-box yes/no, which supports human review", present: false },
      { id: "no-protected-class-signal", label: "The stated reasoning doesn't reference age, gender, name-based ethnicity inference, or other protected characteristics", present: false },
      { id: "cites-years-experience", label: "Years of claims experience is a reasonable, job-relevant factor to cite", present: false },
    ],
    expertApproach:
      "If AI's stated reasoning includes a factor outside your written job requirements, such as which specific carrier someone worked at rather than the skills the role actually requires, treat it as a red flag that needs a human override. Spot-check a random sample of the resumes AI screened out, not just the ones it kept, since that's where unfair filtering hides.",
    skills: ["evaluation", "fundamentals"],
  },
  {
    title: "Regulatory Compliance Review Simulation",
    department: "Compliance",
    difficulty: "HIGH",
    description: "Practice using AI to do a first-pass regulatory review of marketing copy without letting it make the final call.",
    role: "Compliance Analyst, Havenbrook",
    objective: "Review a marketing campaign's copy for state insurance regulatory compliance before it ships, using AI to accelerate the first pass.",
    availableTools: ["ChatGPT"],
    companyPolicy: "AI may flag potentially non-compliant language against Havenbrook's compliance guidelines, but only a licensed compliance officer can approve marketing copy for release across multiple states.",
    workflowNote: "AI-Assisted Regulatory Compliance Review: AI compares marketing and communications copy against state insurance regulatory guidelines and flags potential issues before human compliance review.",
    constraints: "The campaign is set to launch in 8 states tomorrow, and marketing needs a compliance sign-off by end of day.",
    successCriteria: "Every flagged issue is escalated to an actual compliance decision, not resolved by AI's own judgment about what's acceptable.",
    timeLimitMinutes: 90,
    scenario:
      "A marketing campaign is set to launch in 8 states tomorrow, and you need to review the copy for compliance issues today. Walk through how you'd use AI to do a first-pass review against regulatory guidelines, and specifically what you would never let AI decide on its own before it reaches a licensed compliance officer.",
    decisionPrompt: "You receive the campaign copy for review. What's your first step?",
    decisionOptions: [
      {
        id: "flag-then-escalate",
        label: "Have AI flag every phrase that might conflict with state guidelines against your compliance checklist, then personally review and escalate each flagged item to a compliance officer for a final call.",
        quality: "strong",
        consequence: "AI catches a guarantee-style phrase that would have been a real issue in three states. The compliance officer confirms it needs to be revised, and the campaign ships on time with the fix made.",
      },
      {
        id: "accept-ai-clearance",
        label: "Have AI review the copy against general regulatory best practices and clear it for launch if AI finds no issues.",
        quality: "partial",
        consequence: "AI doesn't flag a state-specific disclosure requirement that only applies in two of the eight launch states, since that requirement wasn't in its general training. The campaign launches non-compliant in those states.",
      },
      {
        id: "manual-only",
        label: "Skip AI and manually review the copy against your own memory of the guidelines, since you've done this before.",
        quality: "weak",
        consequence: "You catch the obvious issues but miss a subtler phrase pattern that AI's systematic pass against the checklist would have flagged, given the volume of copy and the tight deadline.",
      },
    ],
    aiOutputSample:
      "Reviewed the campaign copy against general insurance marketing best practices. No major compliance issues found. The phrase 'complete protection, guaranteed' is acceptable as a general marketing statement and does not require additional disclosure.",
    aiOutputIssues: [
      { id: "makes-compliance-decision", label: "The output makes an affirmative compliance clearance decision rather than only flagging items for a compliance officer's review", present: true },
      { id: "guarantee-phrase-cleared", label: "'Guaranteed' coverage language is cleared without flagging that guarantee language is a common regulatory issue in insurance marketing across many states", present: true },
      { id: "general-best-practices-not-state-specific", label: "The review is against 'general best practices,' not the actual state-by-state regulatory guidelines that apply to this launch", present: true },
      { id: "no-issues-flagged", label: "No issues were flagged and escalated for human review", present: false },
      { id: "checks-multiple-states", label: "The output explicitly confirms it checked requirements for all 8 launch states individually", present: false },
    ],
    expertApproach:
      "AI is useful for systematically checking copy against a checklist faster than a manual read, but making the actual compliance call is not its job - especially for state-specific insurance regulations that a general model wasn't trained specifically on. Every flagged (or missed) item still needs a licensed compliance officer's sign-off, and 'guaranteed' language should be treated as a near-automatic flag for insurance marketing copy.",
    skills: ["evaluation", "fundamentals"],
  },
  {
    title: "Vendor Contract Review Simulation",
    department: "Legal",
    difficulty: "HIGH",
    description: "Practice using AI to speed up a first-pass contract review without skipping legal judgment.",
    role: "Contracts Counsel, Havenbrook",
    objective: "Produce a first-pass redline of a third-party vendor contract using AI, escalating what AI cannot safely decide.",
    availableTools: ["ChatGPT"],
    companyPolicy: "Vendor contracts often contain confidential terms. Only use AI tools covered by a signed data processing agreement, and never let AI's suggested redline be sent to a counterparty without a licensed attorney's review.",
    workflowNote: "Contract & Policy Language Review: AI flags non-standard or high-risk clauses against Havenbrook's standard playbook before legal review.",
    constraints: "The vendor is asking for a response by end of week, and three clauses have been materially changed from Havenbrook's standard terms.",
    successCriteria: "You correctly separate what AI can flag (deviation from standard language) from what requires an attorney's independent judgment (whether an unusual term is actually acceptable risk).",
    timeLimitMinutes: 90,
    scenario:
      "A claims-data vendor sent back a services agreement with several clauses changed, including data handling and limitation of liability terms. Walk through how you'd use AI to do a first-pass comparison against Havenbrook's standard terms and draft suggested redlines, and specifically what you would never let AI decide on its own before it reaches a licensed attorney's review.",
    decisionPrompt: "You've just received the redlined contract back from the vendor. What's your first step?",
    decisionOptions: [
      {
        id: "ai-flag-attorney-decide",
        label: "Have AI compare every clause against Havenbrook's standard playbook and flag deviations, but treat every flagged clause as a question for an attorney to decide, not AI.",
        quality: "strong",
        consequence: "AI catches all three changed clauses in minutes, including one subtle change you might have skimmed past given claim data's sensitivity. An attorney reviews the flagged set and makes the actual risk calls.",
      },
      {
        id: "accept-ai-redline",
        label: "Have AI suggest specific redline language for each changed clause and send its suggestions back to the vendor directly to save a review cycle.",
        quality: "partial",
        consequence: "AI's suggested data-handling language is reasonable-sounding but doesn't reflect Havenbrook's actual regulatory obligations around claims data - an attorney would have caught this immediately, but it went out unreviewed.",
      },
      {
        id: "skim-manually",
        label: "Skim the contract yourself for anything that looks different, since you're familiar with the standard terms.",
        quality: "weak",
        consequence: "You catch two of the three changes. The third, a subtle change to the data-handling clause buried in a longer paragraph, goes unnoticed and is only caught in a later audit.",
      },
    ],
    aiOutputSample:
      "Section 6 (Limitation of Liability) has been modified to remove the mutual cap and instead cap only the vendor's liability at $50,000. Section 9 (Data Handling) now permits the vendor to retain claims data after contract termination. Recommended action: Accept the liability change since $50,000 is a reasonable floor for a data vendor of this size.",
    aiOutputIssues: [
      { id: "correctly-identifies-changes", label: "The output correctly identifies both clauses that were actually changed from standard terms", present: false },
      { id: "makes-risk-judgment", label: "The output makes an affirmative recommendation ('accept') on a liability term rather than only flagging the deviation for attorney review", present: true },
      { id: "no-basis-for-reasonable", label: "The output calls $50,000 'a reasonable floor' without reference to Havenbrook's actual risk tolerance for this vendor relationship", present: true },
      { id: "data-retention-flagged-not-judged", label: "The data retention change is flagged as a deviation without AI also rendering a verdict on it", present: false },
      { id: "post-termination-retention-risk", label: "Post-termination data retention by a claims-data vendor is a significant regulatory concern that deserves explicit escalation, not a passing mention", present: true },
    ],
    expertApproach:
      "AI is well-suited to comparing clause language against a playbook and catching deviations a tired eye might miss, especially with contracts this sensitive. It is not suited to deciding whether $50,000 is an acceptable liability cap or whether post-termination data retention by a claims vendor is acceptable risk - those are judgment calls for a licensed attorney who understands Havenbrook's regulatory exposure.",
    skills: ["evaluation", "fundamentals"],
  },
  {
    title: "Board Reporting Simulation",
    department: "Executive",
    difficulty: "MEDIUM",
    description: "Practice using AI to turn scattered team updates into a tight, accurate board memo.",
    role: "VP of Operations, Havenbrook",
    objective: "Synthesize five separate department updates into an accurate one-page board memo using AI.",
    availableTools: ["Claude", "Microsoft 365"],
    companyPolicy: "AI may draft internal synthesis freely. Any figure that will appear in a board-facing document must be verified against its source system before the memo is finalized.",
    workflowNote: "AI-Assisted Board Reporting: AI drafts a first-pass board narrative from department metrics, executives edit and finalize.",
    constraints: "The board memo is due in 2 hours, and your source material is five inconsistent department updates and a rough metrics spreadsheet.",
    successCriteria: "Every figure that appears in the final memo is one you've personally verified against its source, not one AI selected from ambiguous inputs.",
    timeLimitMinutes: 120,
    scenario:
      "You have five separate department updates (claims, underwriting, sales, compliance, IT) and a rough metrics spreadsheet, and a board memo is due in 2 hours. Walk through how you'd use AI to synthesize this into a one-page update, and what facts and figures you would personally verify before it goes to the board.",
    decisionPrompt: "You have the five updates open. What's your first move?",
    decisionOptions: [
      {
        id: "synthesize-then-check-numbers",
        label: "Have AI draft the synthesis first, then personally trace every number in the draft back to its source update or spreadsheet cell before finalizing.",
        quality: "strong",
        consequence: "You find and fix one loss-ratio figure AI misread from an ambiguous update, and the memo goes to the board with every number personally verified.",
      },
      {
        id: "synthesize-and-trust",
        label: "Have AI draft the synthesis and do a quick read-through for tone before sending.",
        quality: "partial",
        consequence: "The memo reads well, but a claims-volume percentage AI calculated from two departments' inconsistent reporting periods is technically wrong. A board member catches the math in the meeting.",
      },
      {
        id: "write-manually",
        label: "Skip AI entirely and write the memo manually from the five updates to be safe.",
        quality: "weak",
        consequence: "Reading and reconciling five inconsistent updates manually takes 90 of your 120 minutes, leaving almost no time to actually verify the numbers you did include.",
      },
    ],
    aiOutputSample:
      "Havenbrook delivered a strong quarter: claims processing time improved to 4.2 days, the loss ratio improved 3 points quarter-over-quarter, and the compliance review automation initiative saved an estimated 300 hours this month. The company is on track to exceed all Q4 targets.",
    aiOutputIssues: [
      { id: "loss-ratio-period-mismatch", label: "The 3-point loss ratio improvement compares two updates that actually covered different time periods, which the draft doesn't flag", present: true },
      { id: "hours-saved-unsourced", label: "The '300 hours saved' figure doesn't trace back to any specific number in the five source updates", present: true },
      { id: "processing-time-figure-real", label: "The 4.2-day claims processing figure matches exactly what the claims update reported", present: false },
      { id: "overreaching-conclusion", label: "'On track to exceed all Q4 targets' is a broader claim than any individual update actually supports", present: true },
      { id: "reads-as-confident", label: "The memo reads confidently and is well-organized for a board audience", present: false },
    ],
    expertApproach:
      "AI is genuinely good at turning five messy updates into one coherent narrative, that's real time saved. But 'coherent' can quietly paper over a mismatched comparison period or a rounded-up figure with no real source, and a board memo is exactly the wrong place for that to slip through. Trace every number back to its source line before it's final.",
    skills: ["evaluation", "automation"],
  },
  {
    title: "Internal Systems Code Review Simulation",
    department: "IT",
    difficulty: "MEDIUM",
    description: "Practice using AI to draft an incident writeup for the Claims Portal without guessing at facts.",
    role: "Software Engineer, Havenbrook",
    objective: "Draft an accurate incident postmortem for a Claims Portal outage using AI, without letting it fill timeline gaps with plausible-sounding guesses.",
    availableTools: ["ChatGPT"],
    companyPolicy: "AI-assisted postmortems must cite an actual log timestamp or transcript line for every factual claim in the timeline - no unsourced statements in a published postmortem, especially for a system claims adjusters depend on daily.",
    workflowNote: "AI Code Review Assistant: AI reviews the diff first for bugs, style, and missing tests, then a human reviewer focuses on design; the same discipline of grounding claims in real logs applies to incident writeups.",
    constraints: "The Claims Portal was down for 25 minutes during business hours, and adjusters across all four offices were affected.",
    successCriteria: "Every timestamp and causal claim in the final postmortem is backed by an actual log line or transcript message, not AI's inference about what 'probably' happened.",
    timeLimitMinutes: 60,
    scenario:
      "The Claims Portal went down for 25 minutes today, and adjusters in all four offices couldn't access claim files during business hours. You have scattered log excerpts and an incident Slack channel transcript. Walk through how you'd use AI to draft the postmortem timeline and root-cause summary, and what you'd cross-check against actual logs before publishing it.",
    decisionPrompt: "You're about to ask AI to draft the timeline. What do you feed it?",
    decisionOptions: [
      {
        id: "raw-sources-only",
        label: "Feed AI the raw log excerpts and Slack transcript only, and ask it to build a timeline strictly from timestamps present in that material, flagging any gap rather than filling it.",
        quality: "strong",
        consequence: "The draft timeline correctly leaves a 4-minute gap marked 'unaccounted for' instead of guessing, which prompts you to check a log source you'd forgotten about, closing the real gap with a real fact.",
      },
      {
        id: "fill-from-memory",
        label: "Feed AI the logs and transcript, plus your own recollection of the sequence of events, and ask it to produce one smooth narrative.",
        quality: "partial",
        consequence: "The postmortem reads cleanly, but your memory of exactly when mitigation started was off by several minutes, a detail no one catches until someone cross-references the deploy log weeks later.",
      },
      {
        id: "ask-for-root-cause-directly",
        label: "Ask AI to determine the root cause directly from a general description of the symptoms, without providing the actual logs.",
        quality: "weak",
        consequence: "AI produces a plausible root cause based on common failure patterns for this type of symptom, which turns out to be entirely wrong - the real cause was specific to the Claims Portal's database configuration and only visible in the actual logs.",
      },
    ],
    aiOutputSample:
      "Timeline: 10:14am - Error rate begins climbing, likely due to a recent deploy. 10:16am - On-call engineer is paged. 10:22am - Root cause identified as a database connection pool exhaustion. 10:39am - Fix deployed and service restored. Root cause: A recent code change failed to release database connections under high load.",
    aiOutputIssues: [
      { id: "likely-due-to-deploy", label: "The 10:14am entry attributes the error spike to a recent deploy using the word 'likely' without citing the deploy timestamp for comparison", present: true },
      { id: "root-cause-time-unsourced", label: "The claim that root cause was 'identified' at 10:22am isn't tied to a specific transcript message or log line", present: true },
      { id: "page-time-matches-logs", label: "The 10:16am page time matches an actual PagerDuty log entry", present: false },
      { id: "root-cause-specific-and-checkable", label: "The stated root cause (connection pool exhaustion from a code change) is specific enough to verify against the actual code diff", present: false },
      { id: "gap-not-flagged", label: "There's a 6-minute gap between paging and root cause identification with no detail on what happened during it, and the draft doesn't flag this as a gap", present: true },
    ],
    expertApproach:
      "A postmortem's value comes entirely from being trustworthy later when someone relies on it to avoid the same failure on a system claims adjusters use daily - a single ungrounded 'likely due to' claim undermines that. Require AI to cite the specific log line or transcript timestamp behind every claim, and treat any point where the story feels smooth-but-vague as a sign it's guessing, not reporting.",
    skills: ["evaluation", "automation"],
  },
];
