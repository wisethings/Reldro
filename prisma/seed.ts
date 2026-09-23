import type { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { computeOrgAdoptionScore, computeFluencyScore } from "../src/lib/scoring";
import { INTEGRATION_CATALOG } from "../src/lib/data/catalog";
import { SIMULATION_CATALOG } from "../src/lib/simulationCatalog";
import { COURSE_CATALOG } from "../src/lib/courseCatalog";

const DEMO_PASSWORD = "Demo1234!";

const DEPARTMENTS = ["Claims", "Underwriting", "Customer Service", "Sales", "Marketing", "Finance", "Operations", "HR", "Compliance"] as const;

function monthsAgo(n: number) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function clearDatabase() {
  const tables = [
    "AuditLog",
    "Notification",
    "MarketplaceTransaction",
    "Invoice",
    "Subscription",
    "ROIMetric",
    "AdoptionMetricSnapshot",
    "AIUsageEvent",
    "IntegrationConnection",
    "Integration",
    "Review",
    "Message",
    "ProjectDeliverable",
    "ProjectMilestone",
    "ProjectTask",
    "Project",
    "InitiativeWorkflow",
    "InitiativeMember",
    "Initiative",
    "Opportunity",
    "OrganizationWorkflow",
    "WorkflowStep",
    "Workflow",
    "SimulationAttempt",
    "Simulation",
    "LessonCompletion",
    "Lesson",
    "Course",
    "LearningPath",
    "EmployeeSkill",
    "Skill",
    "AssessmentResponse",
    "Assessment",
    "SpecialistService",
    "SpecialistTag",
    "Specialist",
    "Employee",
    "User",
    "Department",
    "Organization",
  ];
  for (const table of tables) {
    // @ts-expect-error dynamic model access for cleanup
    await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany();
  }
}

async function seedIntegrations() {
  const created = [];
  for (const i of INTEGRATION_CATALOG) {
    created.push(await prisma.integration.create({ data: { key: i.key, name: i.name, category: i.category, description: i.description, logoKey: i.key } }));
  }
  return created;
}

type WorkflowSeed = {
  title: string;
  department: string;
  industryTags: string[];
  summary: string;
  currentProcess: string;
  aiProcess: string;
  timeSavedMinutes: number;
  difficulty: "LOW" | "MEDIUM" | "HIGH";
  skillLevel: string;
  toolsRequired: string[];
  skillsRequired: string[];
  securityNotes?: string;
  trainingNotes?: string;
  steps: { title: string; description: string; aiPrompt?: string; humanCheckpoint?: boolean }[];
};

const WORKFLOW_SEEDS: WorkflowSeed[] = [
  {
    title: "AI-Assisted Claims Document Processing",
    department: "Claims",
    industryTags: ["Insurance", "Financial services"],
    summary: "Extract key facts from claim documents, flag discrepancies, and draft adjuster notes.",
    currentProcess: "Adjusters manually read every document in a claim file (police reports, estimates, statements) to build their case summary.",
    aiProcess: "AI extracts key facts from claim documents, flags discrepancies between sources, and drafts a structured summary for adjuster review.",
    timeSavedMinutes: 35,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Claims Portal", "ChatGPT"],
    skillsRequired: ["Prompting", "Evaluation"],
    securityNotes: "Claim documents contain policyholder medical and financial details — only use the Claims Portal's built-in assistant, which is covered by Havenbrook's data processing agreement.",
    trainingNotes: "Adjusters need a session on requiring AI to flag discrepancies explicitly rather than silently resolving them.",
    steps: [
      { title: "Claim file received", description: "A new claim file with supporting documents is assigned to an adjuster." },
      { title: "AI extracts key facts", description: "AI pulls key facts from each document with page references.", aiPrompt: "Extract the key facts from this claim document, citing the page or section for each." },
      { title: "AI flags discrepancies", description: "AI flags any contradicting facts, dates, or figures across documents." },
      { title: "AI drafts case summary", description: "AI drafts a structured summary for the adjuster's notes.", aiPrompt: "Draft a case summary from these extracted facts, clearly marking anything unresolved." },
      { title: "Adjuster reviews and finalizes", description: "The adjuster resolves flagged discrepancies and finalizes the file.", humanCheckpoint: true },
    ],
  },
  {
    title: "Claims Triage & Routing",
    department: "Claims",
    industryTags: ["Insurance"],
    summary: "Automatically classify incoming claims by type and severity and route to the right adjuster queue.",
    currentProcess: "A triage adjuster manually reads every incoming claim and routes it to the correct queue based on type and severity.",
    aiProcess: "AI classifies claim type, severity, and potential fraud signals, then auto-routes it, flagging high-severity claims for immediate attention.",
    timeSavedMinutes: 15,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Claims Portal"],
    skillsRequired: ["Workflow design"],
    steps: [
      { title: "Claim submitted", description: "A new claim enters the intake queue." },
      { title: "AI classifies type and severity", description: "AI tags the claim by type and estimated severity.", aiPrompt: "Classify this claim's type and severity (low/medium/high)." },
      { title: "Auto-route to adjuster queue", description: "The claim routes automatically to the right adjuster team." },
      { title: "Supervisor spot-checks high-severity claims", description: "A supervisor reviews any claim flagged high-severity.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Underwriting Research",
    department: "Underwriting",
    industryTags: ["Insurance", "Financial services"],
    summary: "Research a commercial applicant's public risk profile and draft a source-cited summary.",
    currentProcess: "Underwriters manually research an applicant's safety record, litigation history, and financial stability signals.",
    aiProcess: "AI gathers public risk signals about an applicant with sources cited; the underwriter verifies and makes the pricing decision.",
    timeSavedMinutes: 40,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["ChatGPT", "Power BI"],
    skillsRequired: ["Prompting", "Evaluation"],
    trainingNotes: "Underwriters need training on the difference between 'no evidence found' and a confirmed clean record.",
    steps: [
      { title: "Application received", description: "A new commercial insurance application enters the underwriting queue." },
      { title: "AI researches public risk signals", description: "AI gathers safety, litigation, and financial stability signals with sources cited.", aiPrompt: "Research this business's public safety record, litigation history, and financial signals, citing sources for each finding." },
      { title: "Underwriter verifies findings", description: "The underwriter checks cited sources before including any finding in the risk profile.", humanCheckpoint: true },
      { title: "Pricing decision made", description: "The underwriter finalizes the risk profile and pricing." },
    ],
  },
  {
    title: "Policy Renewal Risk Review",
    department: "Underwriting",
    industryTags: ["Insurance"],
    summary: "Draft a renewal risk review from the past year's claims and account activity.",
    currentProcess: "Underwriters manually review a policy's claims history and account changes ahead of each renewal.",
    aiProcess: "AI drafts a first-pass renewal risk summary from the account's claims history and activity; the underwriter verifies and decides.",
    timeSavedMinutes: 30,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["ChatGPT", "Power BI"],
    skillsRequired: ["Evaluation"],
    steps: [
      { title: "Renewal window opens", description: "A policy enters its renewal review window." },
      { title: "AI drafts the risk review", description: "AI summarizes claims history and account changes since the last renewal.", aiPrompt: "Summarize this account's claims history and any changes since the last renewal." },
      { title: "Underwriter reviews and decides", description: "The underwriter verifies the summary and makes the renewal pricing decision.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Policy & Claims Inquiry Response",
    department: "Customer Service",
    industryTags: ["Insurance", "Financial services"],
    summary: "Draft accurate responses to policyholder questions about coverage and claim status.",
    currentProcess: "Representatives manually look up policy terms and claim status, then write a response from scratch.",
    aiProcess: "AI drafts a response referencing the policyholder's actual policy terms and claim status, flagged for verification before sending.",
    timeSavedMinutes: 18,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Claims Portal", "Claude"],
    skillsRequired: ["Prompting", "Evaluation"],
    securityNotes: "Never let a draft state or imply a coverage decision that hasn't actually been made or approved.",
    steps: [
      { title: "Inquiry received", description: "A policyholder contacts customer service about a policy or claim question." },
      { title: "AI pulls policy and claim details", description: "AI retrieves the actual policy terms and claim status from the Claims Portal." },
      { title: "AI drafts a response", description: "AI drafts a response referencing the specific policy and claim details.", aiPrompt: "Draft a response to this policyholder inquiry using their actual policy terms and claim status." },
      { title: "Representative reviews and sends", description: "The representative verifies accuracy and sends.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Insurance Sales Prospecting",
    department: "Sales",
    industryTags: ["Insurance", "Financial services"],
    summary: "Research prospects, draft personalized outreach, and pre-fill CRM records.",
    currentProcess: "Agents manually research each prospect, draft outreach emails, and enter notes into the CRM.",
    aiProcess: "AI researches the prospect's business, drafts a personalized outreach email, and pre-fills CRM fields for agent approval.",
    timeSavedMinutes: 35,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Salesforce", "ChatGPT"],
    skillsRequired: ["Prompting", "Workflow design"],
    trainingNotes: "Agents should learn how to verify AI-researched facts before sending outreach.",
    steps: [
      { title: "Agent receives inbound lead", description: "A new commercial insurance lead enters the pipeline." },
      { title: "AI researches the business", description: "AI gathers public information about the prospect's business and risk profile.", aiPrompt: "Research this business and summarize their size, industry, and insurance needs." },
      { title: "AI drafts personalized outreach", description: "AI writes a first-draft outreach email referencing the research.", aiPrompt: "Draft a personalized outreach email using the research above." },
      { title: "Agent reviews and approves", description: "The agent edits and approves the draft before sending.", humanCheckpoint: true },
      { title: "CRM is updated", description: "Account and activity fields are updated automatically in Salesforce." },
    ],
  },
  {
    title: "Quote Proposal Drafting",
    department: "Sales",
    industryTags: ["Insurance"],
    summary: "Draft first-pass insurance quote proposals from a coverage content library.",
    currentProcess: "Agents manually assemble quote proposals from a shared content library, copy-pasting relevant coverage sections.",
    aiProcess: "AI drafts a first-pass quote proposal from the coverage content library; agents customize and finalize it.",
    timeSavedMinutes: 40,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Salesforce", "ChatGPT"],
    skillsRequired: ["Prompting", "Evaluation"],
    steps: [
      { title: "Quote request received", description: "A prospect requests a quote for a specific coverage need." },
      { title: "AI drafts proposal from content library", description: "AI matches the coverage need to existing approved proposal content.", aiPrompt: "Draft a quote proposal for these coverage needs using our approved content library." },
      { title: "Agent customizes and finalizes", description: "The agent edits the draft for this specific prospect.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Generated Campaign Briefs & Copy Drafts",
    department: "Marketing",
    industryTags: ["Insurance", "Financial services"],
    summary: "Draft campaign briefs and channel-specific copy from a single input brief.",
    currentProcess: "Marketers draft campaign briefs and first-pass copy manually for every channel.",
    aiProcess: "AI drafts a campaign brief and channel-specific copy variants from a single input brief for marketer review.",
    timeSavedMinutes: 40,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Microsoft 365", "Claude"],
    skillsRequired: ["Prompting"],
    securityNotes: "Any coverage or guarantee-style language in AI-drafted copy must be routed through compliance before it ships.",
    steps: [
      { title: "Campaign kickoff", description: "Marketer defines the campaign goal and audience." },
      { title: "AI drafts the campaign brief", description: "AI expands the goal into a structured brief.", aiPrompt: "Turn this campaign goal into a structured campaign brief." },
      { title: "AI drafts channel copy", description: "AI generates copy variants for email, social, and web.", aiPrompt: "Draft 3 copy variants for email and social based on this brief." },
      { title: "Marketer and compliance review", description: "Marketer edits copy and compliance reviews any coverage language before approval.", humanCheckpoint: true },
    ],
  },
  {
    title: "Competitive & Market Intelligence Briefs",
    department: "Marketing",
    industryTags: ["Insurance", "Financial services"],
    summary: "Monitor competitor rates and market moves, and draft a monthly intelligence brief.",
    currentProcess: "Marketing manually tracks competitor rate filings and market moves and compiles a brief once a month.",
    aiProcess: "AI monitors public competitor and market signals and drafts a monthly brief for marketing and product review.",
    timeSavedMinutes: 25,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Claude"],
    skillsRequired: ["Evaluation"],
    steps: [
      { title: "Signals collected", description: "Public competitor and market signals (rate filings, launches, press) are gathered." },
      { title: "AI drafts the brief", description: "AI synthesizes signals into a structured brief.", aiPrompt: "Summarize this month's competitor and market signals into a one-page brief." },
      { title: "Marketer reviews and distributes", description: "Marketer fact-checks and shares with the team.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Financial Reporting Narratives",
    department: "Finance",
    industryTags: ["Insurance", "Financial services"],
    summary: "Draft the narrative and loss-ratio variance commentary for monthly financial reports.",
    currentProcess: "Finance analysts manually write commentary for monthly loss-ratio and budget reports.",
    aiProcess: "AI drafts the narrative and variance commentary directly from the numbers; analysts confirm the cause with claims or underwriting and finalize.",
    timeSavedMinutes: 30,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Power BI", "ChatGPT"],
    skillsRequired: ["Evaluation", "AI safety"],
    securityNotes: "Financial figures should only be shared with AI tools approved under Havenbrook's data governance policy.",
    steps: [
      { title: "Monthly close completes", description: "Finance closes the books for the month." },
      { title: "AI drafts variance commentary", description: "AI writes commentary explaining month-over-month loss-ratio changes.", aiPrompt: "Draft variance commentary explaining these loss-ratio changes." },
      { title: "Analyst confirms cause and finalizes", description: "An analyst confirms the actual cause with claims/underwriting and finalizes the narrative.", humanCheckpoint: true },
    ],
  },
  {
    title: "Expense Anomaly Detection",
    department: "Finance",
    industryTags: ["Insurance", "Financial services"],
    summary: "Flag unusual expenses for review before they're approved.",
    currentProcess: "Finance manually spot-checks expense reports for anomalies.",
    aiProcess: "AI flags unusual expenses against historical patterns for finance review before approval.",
    timeSavedMinutes: 18,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Power BI"],
    skillsRequired: ["Automation"],
    steps: [
      { title: "Expense submitted", description: "An employee submits an expense report." },
      { title: "AI flags anomalies", description: "AI compares the expense against historical patterns and flags outliers." },
      { title: "Finance reviews flagged items", description: "Finance reviews only the flagged subset instead of every report.", humanCheckpoint: true },
    ],
  },
  {
    title: "Internal Knowledge Management Assistant",
    department: "Operations",
    industryTags: ["Insurance", "Financial services"],
    summary: "Answer internal procedure questions from Havenbrook's own SOPs, with a citation.",
    currentProcess: "Employees ask senior staff the same recurring procedural questions, or rely on their own possibly outdated memory of the SOP.",
    aiProcess: "AI searches Havenbrook's internal SOP documents and answers procedural questions with a section citation for verification.",
    timeSavedMinutes: 20,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Microsoft 365", "Claude"],
    skillsRequired: ["Evaluation", "Automation"],
    trainingNotes: "Staff need to check that a cited SOP section is the current version, not a superseded one.",
    steps: [
      { title: "Question asked", description: "An employee has a procedural question they're not fully sure of." },
      { title: "AI searches internal SOPs", description: "AI searches the actual SOP documents and drafts an answer with a section citation.", aiPrompt: "Answer this procedure question using only our internal SOP documents, and cite the specific section." },
      { title: "Employee confirms currency", description: "The employee checks that the cited section reflects the current policy version.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Job Descriptions & Resume Screening",
    department: "HR",
    industryTags: ["Insurance", "Financial services"],
    summary: "Draft job descriptions and pre-screen resumes against role criteria.",
    currentProcess: "Recruiters write job descriptions from scratch and manually screen every resume.",
    aiProcess: "AI drafts job descriptions and pre-screens resumes against role criteria for recruiter review.",
    timeSavedMinutes: 28,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Microsoft 365", "ChatGPT"],
    skillsRequired: ["Prompting"],
    securityNotes: "Screening criteria should be reviewed for bias before deployment.",
    steps: [
      { title: "Role opens", description: "A hiring manager requests a new role (e.g. Claims Adjuster, Underwriter)." },
      { title: "AI drafts the job description", description: "AI writes a first-draft JD from role requirements.", aiPrompt: "Draft a job description for this role and level." },
      { title: "AI pre-screens resumes", description: "AI scores incoming resumes against the written role criteria." },
      { title: "Recruiter reviews shortlist", description: "Recruiter reviews the AI-shortlisted candidates and spot-checks rejections.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Regulatory Compliance Review",
    department: "Compliance",
    industryTags: ["Insurance", "Financial services"],
    summary: "Flag potentially non-compliant marketing and communications language before it ships.",
    currentProcess: "Compliance manually reads every piece of marketing and policyholder communication against state regulatory guidelines.",
    aiProcess: "AI compares copy against state-specific regulatory guidelines and flags potential issues for a compliance officer's final decision.",
    timeSavedMinutes: 30,
    difficulty: "HIGH",
    skillLevel: "Advanced",
    toolsRequired: ["ChatGPT"],
    skillsRequired: ["Evaluation", "AI safety"],
    securityNotes: "AI may only flag potential issues — a licensed compliance officer must make the final release decision, especially across multiple states.",
    steps: [
      { title: "Copy submitted for review", description: "Marketing or communications submits copy ahead of a multi-state launch." },
      { title: "AI flags potential issues", description: "AI compares the copy against state-specific regulatory guidelines and flags risky language.", aiPrompt: "Flag any language in this copy that may conflict with our state insurance marketing guidelines." },
      { title: "Compliance officer decides", description: "A licensed compliance officer reviews flagged items and makes the final call.", humanCheckpoint: true },
    ],
  },
  {
    title: "Contract & Policy Language Review",
    department: "Legal",
    industryTags: ["Insurance", "Legal", "Financial services"],
    summary: "Flag non-standard clauses in incoming vendor contracts before legal review.",
    currentProcess: "Legal manually reads every incoming contract line by line to find non-standard terms.",
    aiProcess: "AI flags non-standard or high-risk clauses against Havenbrook's playbook before legal review.",
    timeSavedMinutes: 55,
    difficulty: "HIGH",
    skillLevel: "Advanced",
    toolsRequired: ["ChatGPT"],
    skillsRequired: ["Evaluation", "AI safety"],
    securityNotes: "Vendor contracts (especially claims-data vendors) contain confidential terms — only use AI tools covered by a signed data processing agreement.",
    steps: [
      { title: "Contract received", description: "A new vendor contract arrives for review." },
      { title: "AI flags non-standard clauses", description: "AI compares clauses against the approved playbook.", aiPrompt: "Flag any clauses in this contract that deviate from our standard playbook." },
      { title: "Attorney reviews flagged clauses", description: "An attorney reviews only the flagged sections in depth and decides on risk.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Board Reporting",
    department: "Executive",
    industryTags: ["Insurance", "Financial services"],
    summary: "Draft board-ready summaries from operating metrics across departments.",
    currentProcess: "Executives and their teams manually compile a board deck narrative from department updates.",
    aiProcess: "AI drafts a first-pass board narrative from department metrics, executives verify every figure and finalize.",
    timeSavedMinutes: 65,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Microsoft 365", "Claude"],
    skillsRequired: ["Evaluation"],
    steps: [
      { title: "Department updates compiled", description: "Metrics and updates are gathered from claims, underwriting, sales, compliance, and IT." },
      { title: "AI drafts the narrative", description: "AI writes a first-pass board narrative from the metrics.", aiPrompt: "Draft a board-ready narrative summarizing these department updates." },
      { title: "Executive team verifies and finalizes", description: "The executive team traces every figure to its source before finalizing.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI Code Review Assistant",
    department: "IT",
    industryTags: ["Insurance"],
    summary: "Get an AI first-pass review on Claims Portal pull requests before human review.",
    currentProcess: "Every pull request to the Claims Portal waits for a human reviewer to check style, bugs, and test coverage.",
    aiProcess: "AI reviews the diff first for bugs, style, and missing tests, then a human reviewer focuses on design.",
    timeSavedMinutes: 20,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["ChatGPT"],
    skillsRequired: ["Evaluation", "Automation"],
    steps: [
      { title: "PR opened", description: "An engineer opens a pull request against the Claims Portal." },
      { title: "AI reviews the diff", description: "AI flags likely bugs, style issues, and missing test coverage." },
      { title: "Human reviewer focuses on design", description: "A human reviewer focuses on architecture and design decisions.", humanCheckpoint: true },
    ],
  },
];

async function seedWorkflows() {
  const created = [];
  for (const w of WORKFLOW_SEEDS) {
    created.push(
      await prisma.workflow.create({
        data: {
          title: w.title,
          department: w.department,
          industryTags: w.industryTags,
          summary: w.summary,
          currentProcess: w.currentProcess,
          aiProcess: w.aiProcess,
          timeSavedMinutes: w.timeSavedMinutes,
          difficulty: w.difficulty,
          skillLevel: w.skillLevel,
          toolsRequired: w.toolsRequired,
          skillsRequired: w.skillsRequired,
          securityNotes: w.securityNotes,
          trainingNotes: w.trainingNotes,
          steps: {
            create: w.steps.map((s, i) => ({
              order: i + 1,
              title: s.title,
              description: s.description,
              aiPrompt: s.aiPrompt,
              humanCheckpoint: s.humanCheckpoint ?? false,
            })),
          },
        },
      })
    );
  }
  return created;
}

async function seedCoursesAndLessons(workflows: Awaited<ReturnType<typeof seedWorkflows>>) {
  for (const c of COURSE_CATALOG) {
    const workflow = workflows.find((w) => w.title === c.workflowTitle);
    await prisma.course.create({
      data: {
        title: c.title,
        description: c.description,
        department: c.department,
        workflowId: workflow?.id,
        role: c.role,
        skills: c.skills,
        tools: c.tools,
        lessons: {
          create: c.lessons.map((l, i) => ({ order: i + 1, ...l })),
        },
      },
    });
  }
}

async function seedSimulations() {
  return prisma.simulation.createMany({ data: SIMULATION_CATALOG, skipDuplicates: true });
}

const SPECIALIST_SEEDS = [
  {
    email: "maya@reldro-specialists.com",
    name: "Maya Johnson",
    headline: "AI Marketing & Automation Specialist",
    bio: "I help consumer brands and agencies fold AI into their marketing operations — from campaign briefs to lifecycle automation — without losing brand voice. 8 years in marketing ops, the last 4 focused entirely on AI-assisted workflows.",
    yearsExperience: 8,
    hourlyRate: 175,
    availability: "Available now",
    location: "Austin, TX",
    ratingAvg: 4.9,
    ratingCount: 38,
    completedProjects: 42,
    approved: true,
    featured: true,
    industries: ["Retail", "Consumer products (CPG)", "Marketing agency"],
    functions: ["Marketing"],
    tools: ["HubSpot", "Claude", "ChatGPT"],
    certifications: ["HubSpot Certified"],
    services: [
      { name: "AI Marketing Workflow Audit", description: "A 2-week audit of your marketing workflows with a prioritized AI adoption roadmap.", priceType: "PROJECT" as const, price: 6500 },
      { name: "Campaign Automation Build", description: "End-to-end build of an AI-assisted campaign brief-to-copy workflow.", priceType: "PROJECT" as const, price: 12000 },
    ],
  },
  {
    email: "david.chen@reldro-specialists.com",
    name: "David Chen",
    headline: "AI Sales & RevOps Specialist",
    bio: "Former RevOps lead turned AI implementation consultant. I build AI-assisted prospecting, CRM enrichment, and forecasting workflows for B2B sales teams.",
    yearsExperience: 6,
    hourlyRate: 150,
    availability: "2 weeks out",
    location: "Chicago, IL",
    ratingAvg: 4.8,
    ratingCount: 24,
    completedProjects: 31,
    approved: true,
    featured: false,
    industries: ["Technology", "Financial services"],
    functions: ["Sales", "RevOps"],
    tools: ["Salesforce", "ChatGPT", "Claude"],
    certifications: ["Salesforce Certified Administrator"],
    services: [
      { name: "AI Prospecting Workflow Setup", description: "Set up AI-assisted research and outreach drafting inside your CRM.", priceType: "PROJECT" as const, price: 9000 },
    ],
  },
  {
    email: "amara@reldro-specialists.com",
    name: "Amara Okafor",
    headline: "AI Automation & Workflow Consultant",
    bio: "I design and implement AI-powered automation across operations — from demand forecasting to procurement — for manufacturing and retail companies with complex supply chains.",
    yearsExperience: 10,
    hourlyRate: 195,
    availability: "Available now",
    location: "Toronto, ON",
    ratingAvg: 5.0,
    ratingCount: 47,
    completedProjects: 55,
    approved: true,
    featured: true,
    industries: ["Manufacturing", "Retail", "Consumer products (CPG)"],
    functions: ["Operations"],
    tools: ["OpenAI", "Notion", "Excel"],
    certifications: [],
    services: [
      { name: "Demand Forecasting AI Pilot", description: "A 6-week pilot integrating AI-assisted forecasting into your planning process.", priceType: "PROJECT" as const, price: 18000 },
    ],
  },
  {
    email: "priya.n@reldro-specialists.com",
    name: "Priya Natarajan",
    headline: "AI Customer Support Specialist",
    bio: "I help support teams deploy AI-assisted triage, summarization, and response drafting without sacrificing customer experience.",
    yearsExperience: 5,
    hourlyRate: 140,
    availability: "Available now",
    location: "Remote",
    ratingAvg: 4.7,
    ratingCount: 16,
    completedProjects: 22,
    approved: true,
    featured: false,
    industries: ["Technology", "Consumer products (CPG)"],
    functions: ["Customer Support"],
    tools: ["Zendesk", "Claude"],
    certifications: [],
    services: [
      { name: "Support AI Rollout", description: "End-to-end rollout of AI-assisted summarization and response drafting.", priceType: "PROJECT" as const, price: 11000 },
    ],
  },
  {
    email: "tom.reilly@reldro-specialists.com",
    name: "Tom Reilly",
    headline: "AI Finance & Data Specialist",
    bio: "I bring AI into FP&A workflows — reporting narratives, anomaly detection, and forecasting — for mid-market finance teams.",
    yearsExperience: 7,
    hourlyRate: 165,
    availability: "Booked",
    location: "Boston, MA",
    ratingAvg: 4.6,
    ratingCount: 12,
    completedProjects: 18,
    approved: true,
    featured: false,
    industries: ["Financial services", "Professional services"],
    functions: ["Finance"],
    tools: ["QuickBooks", "OpenAI"],
    certifications: ["CFA Level II"],
    services: [
      { name: "Finance Reporting AI Setup", description: "Set up AI-drafted variance commentary for monthly reporting.", priceType: "PROJECT" as const, price: 8000 },
    ],
  },
  {
    email: "elena.petrova@reldro-specialists.com",
    name: "Elena Petrova",
    headline: "AI Agent Builder",
    bio: "I design and build custom AI agents and internal tools for engineering and product teams looking to go beyond off-the-shelf assistants.",
    yearsExperience: 9,
    hourlyRate: 210,
    availability: "2 weeks out",
    location: "Berlin, Germany",
    ratingAvg: 4.9,
    ratingCount: 9,
    completedProjects: 12,
    approved: false,
    featured: false,
    industries: ["Technology"],
    functions: ["Engineering"],
    tools: ["OpenAI", "Anthropic"],
    certifications: [],
    services: [
      { name: "Custom AI Agent Build", description: "Design and build a custom internal AI agent for a specific workflow.", priceType: "PROJECT" as const, price: 25000 },
    ],
  },
];

async function seedSpecialists() {
  const created = [];
  for (const s of SPECIALIST_SEEDS) {
    const user = await prisma.user.create({
      data: { email: s.email, name: s.name, passwordHash: await hashPassword(DEMO_PASSWORD), role: "SPECIALIST" as Role },
    });
    const specialist = await prisma.specialist.create({
      data: {
        userId: user.id,
        headline: s.headline,
        bio: s.bio,
        yearsExperience: s.yearsExperience,
        hourlyRate: s.hourlyRate,
        availability: s.availability,
        location: s.location,
        ratingAvg: s.ratingAvg,
        ratingCount: s.ratingCount,
        completedProjects: s.completedProjects,
        approved: s.approved,
        featured: s.featured,
        tags: {
          create: [
            ...s.industries.map((v) => ({ type: "INDUSTRY" as const, value: v })),
            ...s.functions.map((v) => ({ type: "FUNCTION" as const, value: v })),
            ...s.tools.map((v) => ({ type: "TOOL" as const, value: v })),
            ...s.certifications.map((v) => ({ type: "CERTIFICATION" as const, value: v })),
          ],
        },
        services: { create: s.services },
      },
    });
    created.push(specialist);
  }
  return created;
}

async function seedPlatformAdmin() {
  return prisma.user.create({
    data: {
      email: "platform@reldro.com",
      name: "Reldro Platform Team",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: "PLATFORM_ADMIN",
    },
  });
}

const FIRST_NAMES = ["Priya", "Marcus", "Sofia", "James", "Wei", "Isabella", "Noah", "Fatima", "Liam", "Aiko", "Daniel", "Grace", "Mateo", "Zoe", "Ethan", "Amara", "Lucas", "Nadia", "Ryan", "Chloe", "Omar", "Hannah", "Diego", "Mei", "Caleb", "Layla", "Jack", "Priyanka", "Owen", "Sara", "Adrian", "Ines", "Felix", "Nora", "Victor", "Leah", "Tariq", "Emma", "Kenji", "Ava"];
const LAST_NAMES = ["Shah", "Bennett", "Rossi", "Coleman", "Zhang", "Ferreira", "Park", "Haddad", "O'Brien", "Tanaka", "Silva", "Murphy", "Alvarez", "Novak", "Reed", "Okafor", "Bianchi", "Farah", "Sullivan", "Kim", "Haddad", "Whitfield", "Reyes", "Chen", "Foster", "Aziz", "Turner", "Iyer", "Bishop", "Nguyen", "Costa", "Duarte", "Weber", "Blake", "Petrov", "Marsh", "Rahman", "Wells", "Sato", "Hunt"];

const JOB_TITLES: Record<string, string[]> = {
  Claims: ["Claims Adjuster", "Senior Claims Adjuster", "Claims Examiner", "Claims Team Lead", "Claims Processor"],
  Underwriting: ["Underwriter", "Senior Underwriter", "Underwriting Analyst", "Underwriting Assistant"],
  "Customer Service": ["Customer Service Representative", "Customer Service Team Lead", "Customer Success Manager", "Service Operations Analyst"],
  Sales: ["Insurance Sales Agent", "Account Executive", "Sales Manager", "Regional Sales Director", "Sales Operations Analyst"],
  Marketing: ["Marketing Manager", "Content Strategist", "Brand Manager", "Marketing Coordinator", "Campaign Manager"],
  Finance: ["Financial Analyst", "Accountant", "FP&A Manager", "Controller", "Actuarial Analyst"],
  Operations: ["Operations Manager", "Policy Operations Analyst", "Operations Coordinator", "Process Improvement Analyst"],
  HR: ["HR Business Partner", "Recruiter", "People Operations Manager", "HR Generalist"],
  Compliance: ["Compliance Analyst", "Compliance Officer", "Regulatory Affairs Specialist", "Compliance Manager"],
};

async function seedHavenbrook() {
  const org = await prisma.organization.create({
    data: {
      name: "Havenbrook",
      industry: "Insurance",
      size: "318",
      revenueRange: "$100M-$500M",
      geography: "New York, Chicago, Atlanta, Dallas",
      businessModel: "B2B2C",
      goals: ["Standardize AI tool usage", "Increase productivity", "Reduce costs", "Improve customer experience", "Improve decision making"],
      onboardingDone: true,
      onboardingStep: 5,
    },
  });

  const departments = await Promise.all(
    DEPARTMENTS.map((name) => prisma.department.create({ data: { organizationId: org.id, name } }))
  );

  await prisma.user.create({
    data: {
      email: "admin@havenbrook.com",
      name: "Jordan Cole",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: "COMPANY_ADMIN",
      organizationId: org.id,
    },
  });

  // Havenbrook's proprietary internal system - a custom, org-specific tool (not part of the shared global catalog).
  const claimsPortal = await prisma.tool.create({
    data: {
      name: "Claims Portal",
      category: "INTERNAL_PLATFORM",
      vendor: "Havenbrook (internal)",
      description: "Havenbrook's proprietary system for claim intake, document management, and adjuster workflows. Includes a built-in AI assistant covered by Havenbrook's data processing agreement.",
      capabilities: ["Claim intake", "Document management", "Built-in AI assistant", "Adjuster workflows"],
      isCustom: true,
      organizationId: org.id,
    },
  });
  await prisma.organizationTool.create({
    data: { organizationId: org.id, toolId: claimsPortal.id, status: "APPROVED" },
  });

  return { org, departments };
}

async function seedEmployees(org: { id: string }, departments: { id: string; name: string }[]) {
  const deptCounts: Record<string, number> = {
    Claims: 13,
    Underwriting: 9,
    "Customer Service": 10,
    Sales: 8,
    Marketing: 6,
    Finance: 7,
    Operations: 6,
    HR: 4,
    Compliance: 4,
  };

  const employees = [];
  const usedEmails = new Set<string>();
  let nameIndex = 0;
  for (const dept of departments) {
    const count = deptCounts[dept.name] ?? 5;
    for (let i = 0; i < count; i++) {
      const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const last = LAST_NAMES[(nameIndex * 7) % LAST_NAMES.length];
      nameIndex++;
      const name = `${first} ${last}`;
      let email = `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@havenbrook.com`;
      if (usedEmails.has(email)) {
        email = `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}${nameIndex}@havenbrook.com`;
      }
      usedEmails.add(email);
      const jobTitle = pick(JOB_TITLES[dept.name] ?? ["Specialist"]);

      const user = await prisma.user.create({
        data: { email, name, passwordHash: await hashPassword(DEMO_PASSWORD), role: "EMPLOYEE", organizationId: org.id },
      });
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          departmentId: dept.id,
          jobTitle,
          isDepartmentAdmin: i === 0,
          hireDate: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 700)),
        },
      });
      employees.push({ ...employee, departmentName: dept.name });
    }
  }

  // Give priya.shah@havenbrook.com a predictable identity for the demo login button.
  // The randomly-cycled name pool can independently produce the same "Priya Shah"
  // combination for a different employee - free that email first if so.
  const priya = employees.find((e) => e.departmentName === "Marketing");
  if (priya) {
    const conflicting = await prisma.user.findUnique({ where: { email: "priya.shah@havenbrook.com" } });
    if (conflicting && conflicting.id !== priya.userId) {
      await prisma.user.update({ where: { id: conflicting.id }, data: { email: `priya.shah.${conflicting.id.slice(-6)}@havenbrook.com` } });
    }
    const user = await prisma.user.findUnique({ where: { id: priya.userId } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { email: "priya.shah@havenbrook.com", name: "Priya Shah" } });
    }
  }

  return employees;
}

async function seedOrgIntegrations(org: { id: string }, integrations: { id: string; key: string }[]) {
  const connectedKeys = ["microsoft_365", "slack", "salesforce", "quickbooks"];
  for (const integration of integrations) {
    const connected = connectedKeys.includes(integration.key);
    await prisma.integrationConnection.create({
      data: {
        organizationId: org.id,
        integrationId: integration.id,
        status: connected ? "CONNECTED" : "DISCONNECTED",
        connectedAt: connected ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 60) : null,
        lastSyncAt: connected ? new Date(Date.now() - 1000 * 60 * 60 * 6) : null,
        mockData: connected ? { recordsSynced: Math.floor(500 + Math.random() * 3000) } : undefined,
      },
    });
  }
}

async function seedOrgWorkflowAdoption(org: { id: string }, workflows: { id: string; title: string }[]) {
  const adopted = [
    "AI-Generated Campaign Briefs & Copy Drafts",
    "AI-Assisted Job Descriptions & Resume Screening",
  ];
  const inProgress = ["AI-Assisted Claims Document Processing", "AI-Assisted Policy & Claims Inquiry Response", "AI-Assisted Insurance Sales Prospecting"];
  const learning = ["Internal Knowledge Management Assistant"];

  for (const w of workflows) {
    let status: "NOT_ADOPTED" | "LEARNING" | "IN_PROGRESS" | "ADOPTED" = "NOT_ADOPTED";
    if (adopted.includes(w.title)) status = "ADOPTED";
    else if (inProgress.includes(w.title)) status = "IN_PROGRESS";
    else if (learning.includes(w.title)) status = "LEARNING";
    else continue;

    await prisma.organizationWorkflow.create({
      data: {
        organizationId: org.id,
        workflowId: w.id,
        status,
        adoptedAt: status === "ADOPTED" ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) : null,
        usersAdopted: status === "ADOPTED" ? Math.floor(5 + Math.random() * 20) : 0,
      },
    });
  }
}

type OpportunitySeed = {
  title: string;
  department: string;
  workflowTitle?: string;
  currentProcess: string;
  aiOpportunity: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  complexity: "LOW" | "MEDIUM" | "HIGH";
  estHoursSavedMonthly: number;
  estAnnualValue: number;
  status: "IDENTIFIED" | "PLANNED" | "IN_PROGRESS" | "IMPLEMENTED" | "DEFERRED";
  recommendedSpecialist: boolean;
  businessImpactScore: number;
  adoptionPotentialScore: number;
  frequencyScore: number;
  riskScore: number;
  toolsRequired: string[];
};

const OPPORTUNITY_SEEDS: OpportunitySeed[] = [
  {
    title: "AI-Assisted Claims Document Processing",
    department: "Claims",
    workflowTitle: "AI-Assisted Claims Document Processing",
    currentProcess: "Adjusters manually read every document in a claim file to build their case summary.",
    aiOpportunity: "AI extracts key facts from claim documents, flags discrepancies, and drafts a structured summary for adjuster review. At full scale this could save the claims team roughly 1,100 hours per month.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 440,
    estAnnualValue: 260000,
    status: "IN_PROGRESS",
    recommendedSpecialist: true,
    businessImpactScore: 85,
    adoptionPotentialScore: 72,
    frequencyScore: 92,
    riskScore: 28,
    toolsRequired: ["Claims Portal", "ChatGPT"],
  },
  {
    title: "Claims Triage & Routing",
    department: "Claims",
    workflowTitle: "Claims Triage & Routing",
    currentProcess: "A triage adjuster manually reads every incoming claim and routes it to the correct queue.",
    aiOpportunity: "AI classifies claim type and severity and auto-routes it, flagging high-severity claims for immediate attention.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 150,
    estAnnualValue: 80000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 60,
    adoptionPotentialScore: 70,
    frequencyScore: 90,
    riskScore: 24,
    toolsRequired: ["Claims Portal"],
  },
  {
    title: "AI-Assisted Underwriting Research",
    department: "Underwriting",
    workflowTitle: "AI-Assisted Underwriting Research",
    currentProcess: "Underwriters manually research an applicant's public risk profile before pricing.",
    aiOpportunity: "AI gathers public risk signals with sources cited; the underwriter verifies and prices the policy.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 260,
    estAnnualValue: 175000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 76,
    adoptionPotentialScore: 60,
    frequencyScore: 70,
    riskScore: 40,
    toolsRequired: ["ChatGPT", "Power BI"],
  },
  {
    title: "AI-Assisted Policy & Claims Inquiry Response",
    department: "Customer Service",
    workflowTitle: "AI-Assisted Policy & Claims Inquiry Response",
    currentProcess: "Representatives manually look up policy terms and claim status, then write a response from scratch.",
    aiOpportunity: "AI drafts a response referencing the policyholder's actual policy and claim status for representative review.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 300,
    estAnnualValue: 165000,
    status: "IN_PROGRESS",
    recommendedSpecialist: true,
    businessImpactScore: 79,
    adoptionPotentialScore: 68,
    frequencyScore: 88,
    riskScore: 30,
    toolsRequired: ["Claims Portal", "Claude"],
  },
  {
    title: "AI-Assisted Insurance Sales Prospecting",
    department: "Sales",
    workflowTitle: "AI-Assisted Insurance Sales Prospecting",
    currentProcess: "Agents manually research prospects, draft outreach, and log activity in the CRM.",
    aiOpportunity: "AI researches prospect businesses, drafts personalized outreach, and pre-fills CRM fields for agent approval.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 220,
    estAnnualValue: 150000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 74,
    adoptionPotentialScore: 62,
    frequencyScore: 80,
    riskScore: 22,
    toolsRequired: ["Salesforce", "ChatGPT"],
  },
  {
    title: "Quote Proposal Drafting",
    department: "Sales",
    workflowTitle: "Quote Proposal Drafting",
    currentProcess: "Agents assemble quote proposals manually from a shared coverage content library.",
    aiOpportunity: "AI drafts first-pass quote proposals from the content library; agents customize and finalize.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 90,
    estAnnualValue: 60000,
    status: "DEFERRED",
    recommendedSpecialist: false,
    businessImpactScore: 50,
    adoptionPotentialScore: 32,
    frequencyScore: 20,
    riskScore: 28,
    toolsRequired: ["Salesforce", "ChatGPT"],
  },
  {
    title: "AI-Generated Campaign Briefs & Copy Drafts",
    department: "Marketing",
    workflowTitle: "AI-Generated Campaign Briefs & Copy Drafts",
    currentProcess: "Marketers draft campaign briefs and first-pass copy manually for every channel.",
    aiOpportunity: "AI drafts campaign briefs and channel-specific copy variants from a single input brief for marketer review.",
    impact: "MEDIUM",
    complexity: "LOW",
    estHoursSavedMonthly: 150,
    estAnnualValue: 80000,
    status: "IMPLEMENTED",
    recommendedSpecialist: false,
    businessImpactScore: 58,
    adoptionPotentialScore: 74,
    frequencyScore: 78,
    riskScore: 18,
    toolsRequired: ["Microsoft 365", "Claude"],
  },
  {
    title: "Competitive & Market Intelligence Briefs",
    department: "Marketing",
    workflowTitle: "Competitive & Market Intelligence Briefs",
    currentProcess: "Marketing manually tracks competitor rate moves and compiles briefs monthly.",
    aiOpportunity: "AI monitors public competitor and market signals and drafts a monthly brief for review.",
    impact: "LOW",
    complexity: "LOW",
    estHoursSavedMonthly: 35,
    estAnnualValue: 18000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 28,
    adoptionPotentialScore: 48,
    frequencyScore: 25,
    riskScore: 10,
    toolsRequired: ["Claude"],
  },
  {
    title: "AI-Assisted Financial Reporting Narratives",
    department: "Finance",
    workflowTitle: "AI-Assisted Financial Reporting Narratives",
    currentProcess: "Finance analysts manually write commentary for monthly loss-ratio and budget reports.",
    aiOpportunity: "AI drafts the narrative and variance commentary from the numbers; analysts confirm the cause and finalize.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 95,
    estAnnualValue: 68000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 56,
    adoptionPotentialScore: 42,
    frequencyScore: 30,
    riskScore: 35,
    toolsRequired: ["Power BI", "ChatGPT"],
  },
  {
    title: "Expense Anomaly Detection",
    department: "Finance",
    workflowTitle: "Expense Anomaly Detection",
    currentProcess: "Finance manually spot-checks expense reports for anomalies.",
    aiOpportunity: "AI flags unusual expenses against historical patterns for finance review before approval.",
    impact: "LOW",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 35,
    estAnnualValue: 18000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 28,
    adoptionPotentialScore: 45,
    frequencyScore: 30,
    riskScore: 25,
    toolsRequired: ["Power BI"],
  },
  {
    title: "Internal Knowledge Management Assistant",
    department: "Operations",
    workflowTitle: "Internal Knowledge Management Assistant",
    currentProcess: "Employees ask senior staff the same recurring procedural questions.",
    aiOpportunity: "AI answers internal procedure questions from Havenbrook's actual SOPs, with a citation for verification.",
    impact: "MEDIUM",
    complexity: "LOW",
    estHoursSavedMonthly: 100,
    estAnnualValue: 55000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 48,
    adoptionPotentialScore: 55,
    frequencyScore: 60,
    riskScore: 20,
    toolsRequired: ["Microsoft 365", "Claude"],
  },
  {
    title: "AI-Assisted Job Descriptions & Resume Screening",
    department: "HR",
    workflowTitle: "AI-Assisted Job Descriptions & Resume Screening",
    currentProcess: "Recruiters write job descriptions from scratch and manually screen every resume.",
    aiOpportunity: "AI drafts job descriptions and pre-screens resumes against role criteria for recruiter review.",
    impact: "MEDIUM",
    complexity: "LOW",
    estHoursSavedMonthly: 60,
    estAnnualValue: 40000,
    status: "IMPLEMENTED",
    recommendedSpecialist: false,
    businessImpactScore: 45,
    adoptionPotentialScore: 60,
    frequencyScore: 40,
    riskScore: 20,
    toolsRequired: ["Microsoft 365", "ChatGPT"],
  },
  {
    title: "AI-Assisted Regulatory Compliance Review",
    department: "Compliance",
    workflowTitle: "AI-Assisted Regulatory Compliance Review",
    currentProcess: "Compliance manually reads every piece of marketing and communication against state regulatory guidelines.",
    aiOpportunity: "AI flags potentially non-compliant language against state-specific guidelines for a compliance officer's final decision.",
    impact: "HIGH",
    complexity: "HIGH",
    estHoursSavedMonthly: 70,
    estAnnualValue: 95000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 70,
    adoptionPotentialScore: 38,
    frequencyScore: 35,
    riskScore: 60,
    toolsRequired: ["ChatGPT"],
  },
];

async function seedOpportunities(
  org: { id: string },
  departments: { id: string; name: string }[],
  workflows: { id: string; title: string }[]
) {
  const deptByName = new Map(departments.map((d) => [d.name, d.id]));
  const workflowByTitle = new Map(workflows.map((w) => [w.title, w.id]));

  const created = [];
  for (const o of OPPORTUNITY_SEEDS) {
    created.push(
      await prisma.opportunity.create({
        data: {
          organizationId: org.id,
          departmentId: deptByName.get(o.department),
          workflowId: o.workflowTitle ? workflowByTitle.get(o.workflowTitle) : undefined,
          title: o.title,
          currentProcess: o.currentProcess,
          aiOpportunity: o.aiOpportunity,
          impact: o.impact,
          complexity: o.complexity,
          estHoursSavedMonthly: o.estHoursSavedMonthly,
          estAnnualValue: o.estAnnualValue,
          status: o.status,
          recommendedSpecialist: o.recommendedSpecialist,
          businessImpactScore: o.businessImpactScore,
          adoptionPotentialScore: o.adoptionPotentialScore,
          frequencyScore: o.frequencyScore,
          riskScore: o.riskScore,
          toolsRequired: o.toolsRequired,
        },
      })
    );
  }
  return created;
}

async function seedInitiatives(
  org: { id: string },
  departments: { id: string; name: string }[],
  employees: { id: string; departmentName: string }[],
  opportunities: { id: string; title: string }[]
) {
  const deptId = (name: string) => departments.find((d) => d.name === name)!.id;
  void deptId;

  const salesMarketingEmployees = employees.filter((e) => e.departmentName === "Sales" || e.departmentName === "Marketing").slice(0, 8);
  const claimsEmployees = employees.filter((e) => e.departmentName === "Claims").slice(0, 6);

  const salesInitiative = await prisma.initiative.create({
    data: {
      organizationId: org.id,
      name: "AI Sales Transformation",
      goalDescription: "Increase sales-team AI adoption from 32% to 70% within 90 days.",
      startDate: monthsAgo(2),
      endDate: new Date(monthsAgo(2).getTime() + 1000 * 60 * 60 * 24 * 90),
      departments: ["Sales", "Marketing"],
      status: "IN_PROGRESS",
      kpis: [
        { label: "AI adoption", baseline: 32, current: 53, target: 70, unit: "%" },
        { label: "Time saved (hrs/week/rep)", baseline: 0, current: 3.5, target: 6, unit: "h" },
        { label: "Pipeline productivity index", baseline: 100, current: 118, target: 140, unit: "" },
        { label: "Training completion", baseline: 0, current: 64, target: 100, unit: "%" },
      ],
      members: {
        create: salesMarketingEmployees.map((e, i) => ({ employeeId: e.id, roleOnInitiative: i === 0 ? "Lead" : "Contributor" })),
      },
      workflows: {
        create: [
          { opportunityId: opportunities.find((o) => o.title === "AI-Assisted Insurance Sales Prospecting")?.id },
          { opportunityId: opportunities.find((o) => o.title === "AI-Generated Campaign Briefs & Copy Drafts")?.id },
        ],
      },
    },
  });

  const claimsInitiative = await prisma.initiative.create({
    data: {
      organizationId: org.id,
      name: "Claims AI Rollout",
      goalDescription: "Deploy AI-assisted document processing and inquiry response across the claims team.",
      startDate: monthsAgo(4),
      endDate: monthsAgo(1),
      departments: ["Claims"],
      status: "COMPLETED",
      kpis: [
        { label: "AI adoption", baseline: 20, current: 76, target: 75, unit: "%" },
        { label: "Avg. claim review time", baseline: 45, current: 28, target: 28, unit: " min" },
        { label: "Training completion", baseline: 0, current: 100, target: 100, unit: "%" },
      ],
      members: {
        create: claimsEmployees.map((e, i) => ({ employeeId: e.id, roleOnInitiative: i === 0 ? "Lead" : "Contributor" })),
      },
      workflows: {
        create: [{ opportunityId: opportunities.find((o) => o.title === "AI-Assisted Claims Document Processing")?.id }],
      },
    },
  });

  return [salesInitiative, claimsInitiative];
}

async function seedProjects(
  org: { id: string; name: string },
  specialists: { id: string; headline: string }[],
  opportunities: { id: string; title: string; workflowId: string | null }[]
) {
  const maya = specialists[0];
  const david = specialists[1];
  const amara = specialists[2];
  const priya = specialists[3];

  const campaignOpp = opportunities.find((o) => o.title === "AI-Generated Campaign Briefs & Copy Drafts");
  const prospectingOpp = opportunities.find((o) => o.title === "AI-Assisted Insurance Sales Prospecting");
  const underwritingOpp = opportunities.find((o) => o.title === "AI-Assisted Underwriting Research");
  const claimsInquiryOpp = opportunities.find((o) => o.title === "AI-Assisted Policy & Claims Inquiry Response");

  // Completed project with reviews
  const completedProject = await prisma.project.create({
    data: {
      organizationId: org.id,
      specialistId: maya.id,
      opportunityId: campaignOpp?.id,
      workflowId: campaignOpp?.workflowId ?? undefined,
      title: "AI Campaign Brief & Copy Rollout",
      description: "Implemented AI-assisted campaign brief and copy drafting across the marketing team.",
      stage: "OPTIMIZATION",
      status: "COMPLETED",
      budget: 12000,
      startDate: monthsAgo(5),
      targetEndDate: monthsAgo(3),
      milestones: {
        create: ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"].map((stage, i) => ({
          title: stage.replace("_", " "),
          stage: stage as never,
          dueDate: new Date(monthsAgo(5).getTime() + 1000 * 60 * 60 * 24 * 7 * (i + 1)),
          completed: true,
        })),
      },
      tasks: {
        create: [
          { title: "Audit current campaign workflow", status: "DONE", order: 1 },
          { title: "Design AI-assisted brief template", status: "DONE", order: 2 },
          { title: "Train marketing team", status: "DONE", order: 3 },
        ],
      },
    },
  });
  await prisma.review.create({
    data: {
      projectId: completedProject.id,
      specialistId: maya.id,
      organizationId: org.id,
      rating: 5,
      comment: "Maya turned a vague request into a working AI workflow in three weeks. Our team adopted it immediately.",
    },
  });

  const opsProject = await prisma.project.create({
    data: {
      organizationId: org.id,
      specialistId: amara.id,
      opportunityId: underwritingOpp?.id,
      workflowId: underwritingOpp?.workflowId ?? undefined,
      title: "Underwriting Research AI Pilot",
      description: "Piloting AI-assisted public risk research for commercial underwriting.",
      stage: "MEASUREMENT",
      status: "COMPLETED",
      budget: 18000,
      startDate: monthsAgo(6),
      targetEndDate: monthsAgo(2),
      milestones: {
        create: ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT"].map((stage, i) => ({
          title: stage.replace("_", " "),
          stage: stage as never,
          dueDate: new Date(monthsAgo(6).getTime() + 1000 * 60 * 60 * 24 * 7 * (i + 1)),
          completed: true,
        })),
      },
    },
  });
  await prisma.review.create({
    data: {
      projectId: opsProject.id,
      specialistId: amara.id,
      organizationId: org.id,
      rating: 5,
      comment: "Deep expertise in underwriting risk research and very clear about tradeoffs. Underwriters trust the new process.",
    },
  });

  // Active project
  await prisma.project.create({
    data: {
      organizationId: org.id,
      specialistId: david.id,
      opportunityId: prospectingOpp?.id,
      workflowId: prospectingOpp?.workflowId ?? undefined,
      title: "AI-Assisted Insurance Sales Prospecting Implementation",
      description: "Implementing AI-assisted account research and outreach drafting inside Salesforce.",
      stage: "IMPLEMENTATION",
      status: "ACTIVE",
      budget: 9000,
      startDate: monthsAgo(1),
      targetEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      milestones: {
        create: ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"].map((stage, i) => ({
          title: stage.replace("_", " "),
          stage: stage as never,
          dueDate: new Date(monthsAgo(1).getTime() + 1000 * 60 * 60 * 24 * 7 * (i + 1)),
          completed: i < 2,
        })),
      },
      tasks: {
        create: [
          { title: "Kickoff call with sales leadership", status: "DONE", order: 1 },
          { title: "Audit current prospecting workflow", status: "DONE", order: 2 },
          { title: "Configure AI research integration", status: "IN_PROGRESS", order: 3 },
          { title: "Pilot with 5 reps", status: "TODO", order: 4 },
        ],
      },
    },
  });

  // Proposed project (new request for specialist)
  await prisma.project.create({
    data: {
      organizationId: org.id,
      specialistId: priya.id,
      opportunityId: claimsInquiryOpp?.id,
      workflowId: claimsInquiryOpp?.workflowId ?? undefined,
      title: "Policyholder Inquiry AI Rollout Proposal",
      description: "Proposal to roll out AI-assisted policy and claims inquiry response across customer service tiers.",
      stage: "DISCOVERY",
      status: "PROPOSED",
      startDate: new Date(),
      targetEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      milestones: {
        create: ["DISCOVERY", "WORKFLOW_DESIGN", "IMPLEMENTATION", "TRAINING", "LAUNCH", "MEASUREMENT", "OPTIMIZATION"].map((stage, i) => ({
          title: stage.replace("_", " "),
          stage: stage as never,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 * (i + 1)),
          completed: false,
        })),
      },
      tasks: {
        create: [{ title: "Initial discovery call", status: "TODO", order: 1 }],
      },
    },
  });
}

async function seedAssessments(org: { id: string }, employees: { id: string; userId: string }[]) {
  const orgBreakdown = { literacy: 72, usage: 43, workflowIntegration: 38, governance: 67, measurement: 29, leadershipAdoption: 61 };
  const overallScore = computeOrgAdoptionScore(orgBreakdown);

  await prisma.assessment.create({
    data: {
      type: "ORGANIZATION",
      status: "COMPLETED",
      organizationId: org.id,
      overallScore,
      scoreBreakdown: orgBreakdown,
      completedAt: monthsAgo(0),
      responses: {
        create: [
          { category: "literacy", questionKey: "lit_1", questionText: "Employees understand what generative AI can and can't do for their role.", score: 75 },
          { category: "literacy", questionKey: "lit_2", questionText: "Employees can explain the basics of how AI tools produce their output.", score: 69 },
          { category: "usage", questionKey: "usage_1", questionText: "Employees regularly use AI tools as part of their daily work.", score: 45 },
          { category: "usage", questionKey: "usage_2", questionText: "AI usage extends beyond a small group of early adopters.", score: 41 },
          { category: "workflowIntegration", questionKey: "wf_1", questionText: "AI is embedded directly into our core workflows and tools, not just used ad hoc.", score: 35 },
          { category: "workflowIntegration", questionKey: "wf_2", questionText: "We have documented AI-enabled versions of our key processes.", score: 41 },
          { category: "governance", questionKey: "gov_1", questionText: "We have clear policies on acceptable AI use, data privacy, and risk.", score: 70 },
          { category: "governance", questionKey: "gov_2", questionText: "There is a defined owner accountable for AI adoption.", score: 64 },
          { category: "measurement", questionKey: "meas_1", questionText: "We track how much time or cost AI is saving us.", score: 30 },
          { category: "measurement", questionKey: "meas_2", questionText: "We can quantify the business impact of our AI initiatives.", score: 28 },
          { category: "leadershipAdoption", questionKey: "lead_1", questionText: "Senior leadership actively uses and champions AI tools.", score: 63 },
          { category: "leadershipAdoption", questionKey: "lead_2", questionText: "Leadership allocates budget and time toward AI adoption.", score: 59 },
        ],
      },
    },
  });

  // Employee assessments for a subset (~60%) of employees
  const shuffled = [...employees].sort(() => Math.random() - 0.5);
  const assessed = shuffled.slice(0, Math.floor(employees.length * 0.6));

  for (const e of assessed) {
    const breakdown = {
      fundamentals: 50 + Math.floor(Math.random() * 45),
      prompting: 30 + Math.floor(Math.random() * 55),
      workflowDesign: 20 + Math.floor(Math.random() * 55),
      evaluation: 35 + Math.floor(Math.random() * 50),
      automation: 15 + Math.floor(Math.random() * 55),
    };
    const fluency = computeFluencyScore(breakdown);
    await prisma.assessment.create({
      data: {
        type: "EMPLOYEE",
        status: "COMPLETED",
        employeeId: e.id,
        organizationId: org.id,
        overallScore: fluency,
        scoreBreakdown: breakdown,
        completedAt: monthsAgo(Math.floor(Math.random() * 3)),
      },
    });
    await prisma.employee.update({ where: { id: e.id }, data: { aiFluencyScore: fluency } });
  }
}

async function seedAdoptionMetrics(org: { id: string }, departments: { id: string; name: string }[], employees: { id: string }[]) {
  const totalUsers = employees.length;
  const orgScores = [
    { m: 3, score: 41, adoptionPct: 24 },
    { m: 2, score: 46, adoptionPct: 31 },
    { m: 1, score: 51, adoptionPct: 37 },
    { m: 0, score: 54, adoptionPct: 42 },
  ];

  for (const s of orgScores) {
    const activeUsers = Math.round((totalUsers * s.adoptionPct) / 100);
    const ratio = s.score / 54;
    await prisma.adoptionMetricSnapshot.create({
      data: {
        organizationId: org.id,
        department: null,
        month: monthsAgo(s.m),
        activeUsers,
        totalUsers,
        adoptionPct: s.adoptionPct,
        hoursSavedMonthly: Math.round(1840 * ratio),
        aiAdoptionScore: s.score,
        literacyScore: Math.round(72 * ratio),
        usageScore: Math.round(43 * ratio),
        workflowIntegrationScore: Math.round(38 * ratio),
        governanceScore: Math.round(67 * ratio),
        measurementScore: Math.round(29 * ratio),
        leadershipScore: Math.round(61 * ratio),
      },
    });
  }

  const deptAdoption: Record<string, number> = {
    Claims: 76,
    "Customer Service": 71,
    Marketing: 68,
    Sales: 62,
    Underwriting: 50,
    Finance: 44,
    HR: 55,
    Operations: 38,
    Compliance: 29,
  };

  for (const dept of departments) {
    const deptEmployeeCount = Math.max(1, Math.round(totalUsers / departments.length));
    const adoptionPct = deptAdoption[dept.name] ?? 40;
    const activeUsers = Math.round((deptEmployeeCount * adoptionPct) / 100);
    await prisma.adoptionMetricSnapshot.create({
      data: {
        organizationId: org.id,
        department: dept.name,
        month: monthsAgo(0),
        activeUsers,
        totalUsers: deptEmployeeCount,
        adoptionPct,
        hoursSavedMonthly: Math.round((adoptionPct / 100) * 400),
        aiAdoptionScore: Math.round(adoptionPct * 0.9),
        literacyScore: Math.min(95, adoptionPct + 15),
        usageScore: adoptionPct,
        workflowIntegrationScore: Math.max(10, adoptionPct - 20),
        governanceScore: 60,
        measurementScore: Math.max(10, adoptionPct - 30),
        leadershipScore: Math.min(90, adoptionPct + 5),
      },
    });
  }
}

async function seedRoiMetrics(org: { id: string }) {
  const month = monthsAgo(0);
  const rows = [
    { workflowLabel: "AI Claims Document Processing", investment: 24000, annualValue: 260000 },
    { workflowLabel: "AI Policy & Claims Inquiry Response", investment: 20000, annualValue: 165000 },
    { workflowLabel: "AI Sales Prospecting", investment: 18000, annualValue: 150000 },
    { workflowLabel: "AI Marketing Campaigns", investment: 14000, annualValue: 80000 },
    { workflowLabel: "AI Underwriting Research", investment: 18000, annualValue: 175000 },
  ];
  for (const r of rows) {
    await prisma.rOIMetric.create({ data: { organizationId: org.id, month, ...r } });
  }
}

async function seedUsageEvents(org: { id: string }, employees: { id: string; departmentName: string }[]) {
  const toolsByDept: Record<string, string[]> = {
    Claims: ["Claims Portal", "ChatGPT"],
    Underwriting: ["ChatGPT", "Power BI"],
    "Customer Service": ["Claims Portal", "Claude"],
    Sales: ["Salesforce Einstein", "ChatGPT"],
    Marketing: ["Microsoft Copilot", "Claude"],
    Finance: ["Power BI", "ChatGPT"],
    Operations: ["Claude", "Microsoft Copilot"],
    HR: ["ChatGPT", "Microsoft Copilot"],
    Compliance: ["ChatGPT"],
  };

  const events = [];
  for (const e of employees) {
    if (Math.random() > 0.55) continue; // only "active" users log events
    const tools = toolsByDept[e.departmentName] ?? ["ChatGPT"];
    const eventCount = 1 + Math.floor(Math.random() * 6);
    for (let i = 0; i < eventCount; i++) {
      events.push({
        organizationId: org.id,
        employeeId: e.id,
        tool: pick(tools),
        eventType: pick(["draft_generated", "summary_generated", "classification", "research"]),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)),
      });
    }
  }
  await prisma.aIUsageEvent.createMany({ data: events });
}

async function seedLessonProgress(employees: { id: string; departmentName: string }[]) {
  const courses = await prisma.course.findMany({ include: { lessons: true } });
  for (const e of employees) {
    const relevantCourses = courses.filter((c) => c.department === e.departmentName);
    for (const course of relevantCourses) {
      for (const lesson of course.lessons) {
        if (Math.random() < 0.55) {
          await prisma.lessonCompletion.create({
            data: { employeeId: e.id, lessonId: lesson.id, score: 80 + Math.floor(Math.random() * 20) },
          }).catch(() => undefined);
        }
      }
    }
  }
}

async function seedSubscription(org: { id: string }) {
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      tier: "GROWTH",
      status: "ACTIVE",
      seats: 150,
      pricePerMonth: 1500,
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
    },
  });

  await prisma.invoice.createMany({
    data: [
      { organizationId: org.id, amount: 150000, status: "PAID", issuedAt: monthsAgo(2), dueAt: monthsAgo(2), description: "Growth plan — monthly subscription" },
      { organizationId: org.id, amount: 150000, status: "PAID", issuedAt: monthsAgo(1), dueAt: monthsAgo(1), description: "Growth plan — monthly subscription" },
      { organizationId: org.id, amount: 150000, status: "OPEN", issuedAt: monthsAgo(0), dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), description: "Growth plan — monthly subscription" },
    ],
  });
}

export async function seedDatabase() {
  console.log("Clearing database...");
  await clearDatabase();

  console.log("Seeding integrations...");
  const integrations = await seedIntegrations();

  console.log("Seeding workflows...");
  const workflows = await seedWorkflows();

  console.log("Seeding courses & lessons...");
  await seedCoursesAndLessons(workflows);

  console.log("Seeding simulations...");
  await seedSimulations();

  console.log("Seeding specialists...");
  const specialists = await seedSpecialists();

  console.log("Seeding platform admin...");
  await seedPlatformAdmin();

  console.log("Seeding Havenbrook...");
  const { org, departments } = await seedHavenbrook();

  console.log("Seeding employees...");
  const employees = await seedEmployees(org, departments);

  console.log("Seeding org integration connections...");
  await seedOrgIntegrations(org, integrations);

  console.log("Seeding workflow adoption...");
  await seedOrgWorkflowAdoption(org, workflows);

  console.log("Seeding opportunities...");
  const opportunities = await seedOpportunities(org, departments, workflows);

  console.log("Seeding initiatives...");
  await seedInitiatives(org, departments, employees, opportunities);

  console.log("Seeding projects & specialist engagements...");
  const opportunitiesWithWorkflow = await prisma.opportunity.findMany({ where: { organizationId: org.id } });
  await seedProjects(org, specialists, opportunitiesWithWorkflow);

  console.log("Seeding assessments...");
  await seedAssessments(org, employees);

  console.log("Seeding adoption metrics...");
  await seedAdoptionMetrics(org, departments, employees);

  console.log("Seeding ROI metrics...");
  await seedRoiMetrics(org);

  console.log("Seeding AI usage events...");
  await seedUsageEvents(org, employees);

  console.log("Seeding lesson progress...");
  await seedLessonProgress(employees);

  console.log("Seeding subscription & billing...");
  await seedSubscription(org);

  console.log("Done. Demo password for all seeded accounts:", DEMO_PASSWORD);
}

if (typeof require !== "undefined" && require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
