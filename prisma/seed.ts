import type { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { computeOrgAdoptionScore, computeFluencyScore } from "../src/lib/scoring";
import { INTEGRATION_CATALOG } from "../src/lib/data/catalog";
import { SIMULATION_CATALOG } from "../src/lib/simulationCatalog";
import { COURSE_CATALOG } from "../src/lib/courseCatalog";

const DEMO_PASSWORD = "Demo1234!";

const DEPARTMENTS = ["Marketing", "Sales", "Finance", "Operations", "Customer Support", "HR", "Product"] as const;

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
    title: "AI Conversation Summarization & Response Drafting",
    department: "Customer Support",
    industryTags: ["Retail", "Consumer products (CPG)", "Technology", "Business services"],
    summary: "Summarize customer conversations, classify intent, and draft follow-up responses.",
    currentProcess: "Agents manually summarize customer conversations and write follow-up emails after every ticket.",
    aiProcess: "AI summarizes the conversation, classifies intent, drafts a response, and flags escalation risk for agent review.",
    timeSavedMinutes: 22,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Zendesk", "Claude"],
    skillsRequired: ["Prompting", "Evaluation"],
    securityNotes: "Redact customer PII before sending transcripts to any AI tool that isn't under a data processing agreement.",
    trainingNotes: "Agents need a 20-minute session on reviewing AI drafts for tone and accuracy before go-live.",
    steps: [
      { title: "Ticket received", description: "A customer conversation closes and is queued for follow-up." },
      { title: "AI summarizes the conversation", description: "AI produces a structured summary of the issue and resolution.", aiPrompt: "Summarize this support conversation in 3 sentences, noting the customer's issue, resolution, and sentiment." },
      { title: "AI classifies intent and risk", description: "AI tags the ticket by category and flags any escalation risk." },
      { title: "AI drafts a follow-up response", description: "AI writes a follow-up email drafted in the company's tone.", aiPrompt: "Draft a friendly follow-up email confirming the resolution above." },
      { title: "Agent reviews and sends", description: "Agent reviews the draft, edits if needed, and sends.", humanCheckpoint: true },
    ],
  },
  {
    title: "Support Ticket Triage & Routing",
    department: "Customer Support",
    industryTags: ["Retail", "Technology", "Business services"],
    summary: "Automatically classify and route incoming tickets to the right queue.",
    currentProcess: "A triage agent manually reads every incoming ticket and routes it to the correct queue.",
    aiProcess: "AI classifies ticket intent and urgency and auto-routes it, flagging high-risk tickets for immediate attention.",
    timeSavedMinutes: 12,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Zendesk"],
    skillsRequired: ["Workflow design"],
    steps: [
      { title: "Ticket arrives", description: "A new ticket enters the support queue." },
      { title: "AI classifies intent and urgency", description: "AI tags the ticket with category and priority.", aiPrompt: "Classify this ticket's intent and urgency (low/medium/high)." },
      { title: "Auto-route to queue", description: "The ticket routes automatically to the right team." },
      { title: "Supervisor spot-checks high-risk tickets", description: "A supervisor reviews any ticket flagged high-risk.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Sales Prospecting",
    department: "Sales",
    industryTags: ["Technology", "Financial services", "Consumer products (CPG)", "Professional services", "Business services", "Insurance"],
    summary: "Research prospects, draft personalized outreach, and pre-fill CRM records.",
    currentProcess: "Reps manually research each prospect, draft outreach emails, and enter notes into the CRM.",
    aiProcess: "AI researches the account, drafts a personalized outreach email, and pre-fills CRM fields for rep approval.",
    timeSavedMinutes: 35,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Salesforce", "ChatGPT"],
    skillsRequired: ["Prompting", "Workflow design"],
    trainingNotes: "Reps should learn how to verify AI-researched facts before sending outreach.",
    steps: [
      { title: "Employee receives inbound lead", description: "A new lead enters the pipeline." },
      { title: "AI researches the company", description: "AI gathers public information about the account.", aiPrompt: "Research this company and summarize their business, size, and recent news." },
      { title: "AI drafts personalized outreach", description: "AI writes a first-draft outreach email referencing the research.", aiPrompt: "Draft a personalized cold outreach email using the research above." },
      { title: "Rep reviews and approves", description: "The rep edits and approves the draft before sending.", humanCheckpoint: true },
      { title: "CRM is updated", description: "Account and activity fields are updated automatically in Salesforce." },
    ],
  },
  {
    title: "Proposal & RFP Response Drafting",
    department: "Sales",
    industryTags: ["Professional services", "Technology", "Business services", "Insurance"],
    summary: "Draft first-pass RFP responses from an existing content library.",
    currentProcess: "Reps manually assemble RFP responses from a shared document library, copy-pasting relevant sections.",
    aiProcess: "AI drafts a first-pass RFP response from the content library; reps customize and finalize it.",
    timeSavedMinutes: 45,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Salesforce", "ChatGPT"],
    skillsRequired: ["Prompting", "Evaluation"],
    steps: [
      { title: "RFP received", description: "A new RFP or proposal request comes in." },
      { title: "AI drafts responses from content library", description: "AI matches RFP questions to existing approved content.", aiPrompt: "Draft responses to these RFP questions using our approved content library." },
      { title: "Rep customizes and finalizes", description: "The rep edits the draft for this specific client.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Generated Campaign Briefs & Copy Drafts",
    department: "Marketing",
    industryTags: ["Retail", "Consumer products (CPG)", "Marketing agency", "Professional services", "Technology"],
    summary: "Draft campaign briefs and channel-specific copy from a single input brief.",
    currentProcess: "Marketers draft campaign briefs and first-pass copy manually for every channel.",
    aiProcess: "AI drafts a campaign brief and channel-specific copy variants from a single input brief for marketer review.",
    timeSavedMinutes: 40,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["HubSpot", "Claude"],
    skillsRequired: ["Prompting"],
    steps: [
      { title: "Campaign kickoff", description: "Marketer defines the campaign goal and audience." },
      { title: "AI drafts the campaign brief", description: "AI expands the goal into a structured brief.", aiPrompt: "Turn this campaign goal into a structured campaign brief." },
      { title: "AI drafts channel copy", description: "AI generates copy variants for email, social, and web.", aiPrompt: "Draft 3 copy variants for email and social based on this brief." },
      { title: "Marketer reviews and finalizes", description: "Marketer edits and approves final copy.", humanCheckpoint: true },
    ],
  },
  {
    title: "Competitive Intelligence Briefs",
    department: "Marketing",
    industryTags: ["Retail", "Consumer products (CPG)", "Technology", "Financial services", "Insurance"],
    summary: "Monitor competitor activity and draft a monthly intelligence brief.",
    currentProcess: "Marketing manually tracks competitor moves and compiles a brief once a month.",
    aiProcess: "AI monitors public competitor signals and drafts a monthly brief for marketing review.",
    timeSavedMinutes: 25,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Claude"],
    skillsRequired: ["Evaluation"],
    steps: [
      { title: "Signals collected", description: "Public competitor signals (pricing, launches, press) are gathered." },
      { title: "AI drafts the brief", description: "AI synthesizes signals into a structured brief.", aiPrompt: "Summarize this month's competitor signals into a one-page brief." },
      { title: "Marketer reviews and distributes", description: "Marketer fact-checks and shares with the team.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Monthly Reporting Narratives",
    department: "Finance",
    industryTags: ["Financial services", "Consumer products (CPG)", "Professional services", "Technology", "Insurance"],
    summary: "Draft the narrative and variance commentary for monthly financial reports.",
    currentProcess: "Finance analysts manually write commentary for monthly board and budget reports.",
    aiProcess: "AI drafts the narrative and variance commentary directly from the numbers; analysts review and finalize.",
    timeSavedMinutes: 30,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["QuickBooks", "ChatGPT"],
    skillsRequired: ["Evaluation", "AI safety"],
    securityNotes: "Financial figures should only be shared with AI tools approved under the company's data governance policy.",
    steps: [
      { title: "Monthly close completes", description: "Finance closes the books for the month." },
      { title: "AI drafts variance commentary", description: "AI writes commentary explaining month-over-month changes.", aiPrompt: "Draft variance commentary explaining these budget-to-actual differences." },
      { title: "Analyst reviews and finalizes", description: "An analyst verifies figures and finalizes the narrative.", humanCheckpoint: true },
    ],
  },
  {
    title: "Expense Anomaly Detection",
    department: "Finance",
    industryTags: ["Financial services", "Professional services", "Business services", "Technology"],
    summary: "Flag unusual expenses for review before they're approved.",
    currentProcess: "Finance manually spot-checks expense reports for anomalies.",
    aiProcess: "AI flags unusual expenses against historical patterns for finance review before approval.",
    timeSavedMinutes: 18,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["QuickBooks"],
    skillsRequired: ["Automation"],
    steps: [
      { title: "Expense submitted", description: "An employee submits an expense report." },
      { title: "AI flags anomalies", description: "AI compares the expense against historical patterns and flags outliers." },
      { title: "Finance reviews flagged items", description: "Finance reviews only the flagged subset instead of every report.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Job Descriptions & Resume Screening",
    department: "HR",
    industryTags: ["Professional services", "Technology", "Business services", "Insurance", "Financial services"],
    summary: "Draft job descriptions and pre-screen resumes against role criteria.",
    currentProcess: "Recruiters write job descriptions from scratch and manually screen every resume.",
    aiProcess: "AI drafts job descriptions and pre-screens resumes against role criteria for recruiter review.",
    timeSavedMinutes: 28,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Notion", "ChatGPT"],
    skillsRequired: ["Prompting"],
    securityNotes: "Screening criteria should be reviewed for bias before deployment.",
    steps: [
      { title: "Role opens", description: "A hiring manager requests a new role." },
      { title: "AI drafts the job description", description: "AI writes a first-draft JD from role requirements.", aiPrompt: "Draft a job description for this role and level." },
      { title: "AI pre-screens resumes", description: "AI scores incoming resumes against the role criteria." },
      { title: "Recruiter reviews shortlist", description: "Recruiter reviews the AI-shortlisted candidates.", humanCheckpoint: true },
    ],
  },
  {
    title: "Demand Forecasting Assistant",
    department: "Operations",
    industryTags: ["Retail", "Consumer products (CPG)", "Manufacturing"],
    summary: "Incorporate external signals into demand forecasts and flag anomalies.",
    currentProcess: "Planners build demand forecasts in spreadsheets using historical sales data alone.",
    aiProcess: "AI-assisted forecasting incorporates external signals (seasonality, promotions, trends) and flags anomalies for planner review.",
    timeSavedMinutes: 50,
    difficulty: "HIGH",
    skillLevel: "Advanced",
    toolsRequired: ["Excel", "OpenAI"],
    skillsRequired: ["Workflow design", "Automation"],
    trainingNotes: "Planners need training on interpreting model confidence intervals, not just point forecasts.",
    steps: [
      { title: "Historical data compiled", description: "Sales history and planned promotions are compiled." },
      { title: "AI generates forecast", description: "AI produces a demand forecast incorporating external signals." },
      { title: "AI flags anomalies", description: "AI highlights SKUs where the forecast deviates sharply from history." },
      { title: "Planner reviews and adjusts", description: "Planner reviews flagged items and finalizes the forecast.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Product Requirement Docs",
    department: "Product",
    industryTags: ["Technology"],
    summary: "Draft a structured PRD from meeting notes and prior documentation.",
    currentProcess: "Product managers write requirement docs manually from scattered notes and interviews.",
    aiProcess: "AI drafts a structured PRD from meeting notes and prior docs for PM review.",
    timeSavedMinutes: 60,
    difficulty: "LOW",
    skillLevel: "Beginner",
    toolsRequired: ["Notion", "Claude"],
    skillsRequired: ["Prompting"],
    steps: [
      { title: "Discovery notes compiled", description: "PM gathers notes from customer and stakeholder interviews." },
      { title: "AI drafts the PRD", description: "AI structures the notes into a standard PRD format.", aiPrompt: "Turn these interview notes into a structured PRD with goals, requirements, and open questions." },
      { title: "PM reviews and refines", description: "PM edits and circulates for feedback.", humanCheckpoint: true },
    ],
  },
  {
    title: "Contract Review Assistant",
    department: "Legal",
    industryTags: ["Legal", "Professional services", "Financial services", "Business services", "Insurance", "Technology"],
    summary: "Flag non-standard clauses in incoming contracts before legal review.",
    currentProcess: "Legal manually reads every incoming contract line by line to find non-standard terms.",
    aiProcess: "AI flags non-standard or high-risk clauses against the company's playbook before legal review.",
    timeSavedMinutes: 55,
    difficulty: "HIGH",
    skillLevel: "Advanced",
    toolsRequired: ["OpenAI"],
    skillsRequired: ["Evaluation", "AI safety"],
    securityNotes: "Contracts often contain confidential terms — only use AI tools covered by a signed data processing agreement.",
    steps: [
      { title: "Contract received", description: "A new contract arrives for review." },
      { title: "AI flags non-standard clauses", description: "AI compares clauses against the approved playbook.", aiPrompt: "Flag any clauses in this contract that deviate from our standard playbook." },
      { title: "Attorney reviews flagged clauses", description: "An attorney reviews only the flagged sections in depth.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI-Assisted Board Reporting",
    department: "Executive",
    industryTags: ["Technology", "Financial services", "Professional services", "Business services", "Insurance"],
    summary: "Draft board-ready summaries from operating metrics across departments.",
    currentProcess: "Executives and their teams manually compile a board deck narrative from department updates.",
    aiProcess: "AI drafts a first-pass board narrative from department metrics, executives edit and finalize.",
    timeSavedMinutes: 65,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Notion", "Claude"],
    skillsRequired: ["Evaluation"],
    steps: [
      { title: "Department updates compiled", description: "Metrics and updates are gathered from each department." },
      { title: "AI drafts the narrative", description: "AI writes a first-pass board narrative from the metrics.", aiPrompt: "Draft a board-ready narrative summarizing these department updates." },
      { title: "Executive team finalizes", description: "The executive team edits and finalizes the deck.", humanCheckpoint: true },
    ],
  },
  {
    title: "AI Code Review Assistant",
    department: "Engineering",
    industryTags: ["Technology"],
    summary: "Get an AI first-pass review on pull requests before human review.",
    currentProcess: "Every pull request waits for a human reviewer to check style, bugs, and test coverage.",
    aiProcess: "AI reviews the diff first for bugs, style, and missing tests, then a human reviewer focuses on design.",
    timeSavedMinutes: 20,
    difficulty: "MEDIUM",
    skillLevel: "Intermediate",
    toolsRequired: ["Jira", "OpenAI"],
    skillsRequired: ["Evaluation", "Automation"],
    steps: [
      { title: "PR opened", description: "An engineer opens a pull request." },
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
  Marketing: ["Marketing Manager", "Content Strategist", "Brand Manager", "Growth Marketer", "Marketing Coordinator", "Campaign Manager"],
  Sales: ["Account Executive", "Sales Development Rep", "Sales Manager", "Regional Sales Director", "Sales Operations Analyst"],
  Finance: ["Financial Analyst", "Accountant", "FP&A Manager", "Controller", "AP/AR Specialist"],
  Operations: ["Operations Manager", "Supply Chain Analyst", "Demand Planner", "Logistics Coordinator", "Operations Analyst"],
  "Customer Support": ["Support Agent", "Support Team Lead", "Customer Success Manager", "Support Operations Analyst"],
  HR: ["HR Business Partner", "Recruiter", "People Operations Manager", "HR Generalist"],
  Product: ["Product Manager", "Product Designer", "Product Analyst"],
};

async function seedNorthstar() {
  const org = await prisma.organization.create({
    data: {
      name: "Northstar Consumer Group",
      industry: "Consumer products (CPG)",
      size: "412",
      revenueRange: "$250M-$1B",
      geography: "North America",
      businessModel: "B2C",
      goals: ["Increase productivity", "Reduce costs", "Improve customer experience", "Improve marketing", "Improve decision making"],
      onboardingDone: true,
      onboardingStep: 5,
    },
  });

  const departments = await Promise.all(
    DEPARTMENTS.map((name) => prisma.department.create({ data: { organizationId: org.id, name } }))
  );

  await prisma.user.create({
    data: {
      email: "admin@northstarcg.com",
      name: "Jordan Cole",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: "COMPANY_ADMIN",
      organizationId: org.id,
    },
  });

  return { org, departments };
}

async function seedEmployees(org: { id: string }, departments: { id: string; name: string }[]) {
  const deptCounts: Record<string, number> = {
    Marketing: 9,
    Sales: 10,
    Finance: 6,
    Operations: 8,
    "Customer Support": 9,
    HR: 4,
    Product: 3,
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
      let email = `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@northstarcg.com`;
      if (usedEmails.has(email)) {
        email = `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}${nameIndex}@northstarcg.com`;
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

  // Give priya.shah@northstarcg.com a predictable identity for the demo login button
  const priya = employees.find((e) => e.departmentName === "Marketing");
  if (priya) {
    const user = await prisma.user.findUnique({ where: { id: priya.userId } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { email: "priya.shah@northstarcg.com", name: "Priya Shah" } });
    }
  }

  return employees;
}

async function seedOrgIntegrations(org: { id: string }, integrations: { id: string; key: string }[]) {
  const connectedKeys = ["google_workspace", "slack", "hubspot", "zendesk", "quickbooks"];
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
  const inProgress = ["AI Conversation Summarization & Response Drafting", "AI-Assisted Sales Prospecting"];
  const learning = ["Demand Forecasting Assistant"];

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
    title: "AI Conversation Summarization & Response Drafting",
    department: "Customer Support",
    workflowTitle: "AI Conversation Summarization & Response Drafting",
    currentProcess: "Agents manually summarize customer conversations and write follow-up emails.",
    aiOpportunity: "Use AI to summarize conversations, classify intent, generate response drafts, and identify escalation risk. At full scale this could save the support team roughly 1,200 hours per month.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 420,
    estAnnualValue: 240000,
    status: "IN_PROGRESS",
    recommendedSpecialist: true,
    businessImpactScore: 82,
    adoptionPotentialScore: 70,
    frequencyScore: 90,
    riskScore: 25,
    toolsRequired: ["Zendesk", "Claude"],
  },
  {
    title: "AI-Assisted Sales Prospecting",
    department: "Sales",
    workflowTitle: "AI-Assisted Sales Prospecting",
    currentProcess: "Reps manually research prospects, draft outreach, and log activity in the CRM.",
    aiOpportunity: "AI researches accounts, drafts personalized outreach, and pre-fills CRM fields for rep approval.",
    impact: "HIGH",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 310,
    estAnnualValue: 185000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 78,
    adoptionPotentialScore: 65,
    frequencyScore: 85,
    riskScore: 20,
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
    estHoursSavedMonthly: 180,
    estAnnualValue: 90000,
    status: "IMPLEMENTED",
    recommendedSpecialist: false,
    businessImpactScore: 60,
    adoptionPotentialScore: 75,
    frequencyScore: 80,
    riskScore: 15,
    toolsRequired: ["HubSpot", "Claude"],
  },
  {
    title: "AI-Assisted Monthly Reporting Narratives",
    department: "Finance",
    workflowTitle: "AI-Assisted Monthly Reporting Narratives",
    currentProcess: "Finance analysts manually write commentary for monthly board and budget reports.",
    aiOpportunity: "AI drafts the narrative and variance commentary from the numbers; analysts review and finalize.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 90,
    estAnnualValue: 65000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 55,
    adoptionPotentialScore: 40,
    frequencyScore: 30,
    riskScore: 35,
    toolsRequired: ["QuickBooks", "ChatGPT"],
  },
  {
    title: "AI Demand Forecasting Assistant",
    department: "Operations",
    workflowTitle: "Demand Forecasting Assistant",
    currentProcess: "Planners build demand forecasts in spreadsheets using historical sales data alone.",
    aiOpportunity: "AI-assisted forecasting incorporates external signals and flags anomalies for planner review.",
    impact: "HIGH",
    complexity: "HIGH",
    estHoursSavedMonthly: 140,
    estAnnualValue: 210000,
    status: "IDENTIFIED",
    recommendedSpecialist: true,
    businessImpactScore: 80,
    adoptionPotentialScore: 35,
    frequencyScore: 20,
    riskScore: 55,
    toolsRequired: ["Excel", "OpenAI"],
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
    toolsRequired: ["Notion", "ChatGPT"],
  },
  {
    title: "AI-Assisted Product Requirement Docs",
    department: "Product",
    workflowTitle: "AI-Assisted Product Requirement Docs",
    currentProcess: "Product managers write requirement docs manually from scattered notes and interviews.",
    aiOpportunity: "AI drafts a structured PRD from meeting notes and prior docs for PM review.",
    impact: "MEDIUM",
    complexity: "LOW",
    estHoursSavedMonthly: 50,
    estAnnualValue: 35000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 42,
    adoptionPotentialScore: 55,
    frequencyScore: 35,
    riskScore: 15,
    toolsRequired: ["Notion", "Claude"],
  },
  {
    title: "Support Ticket Triage & Routing",
    department: "Customer Support",
    workflowTitle: "Support Ticket Triage & Routing",
    currentProcess: "Tickets are manually read and routed to the right queue by a triage agent.",
    aiOpportunity: "AI classifies intent and urgency and auto-routes tickets, flagging high-risk ones for immediate attention.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 130,
    estAnnualValue: 70000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 58,
    adoptionPotentialScore: 68,
    frequencyScore: 88,
    riskScore: 22,
    toolsRequired: ["Zendesk"],
  },
  {
    title: "Proposal & RFP Response Drafting",
    department: "Sales",
    workflowTitle: "Proposal & RFP Response Drafting",
    currentProcess: "Reps assemble RFP responses manually from a shared document library.",
    aiOpportunity: "AI drafts first-pass RFP responses from the content library; reps customize and finalize.",
    impact: "MEDIUM",
    complexity: "MEDIUM",
    estHoursSavedMonthly: 70,
    estAnnualValue: 55000,
    status: "DEFERRED",
    recommendedSpecialist: false,
    businessImpactScore: 48,
    adoptionPotentialScore: 30,
    frequencyScore: 15,
    riskScore: 30,
    toolsRequired: ["Salesforce", "ChatGPT"],
  },
  {
    title: "Competitive Intelligence Briefs",
    department: "Marketing",
    workflowTitle: "Competitive Intelligence Briefs",
    currentProcess: "Marketing manually tracks competitor moves and compiles briefs monthly.",
    aiOpportunity: "AI monitors public competitor signals and drafts a monthly brief for marketing review.",
    impact: "LOW",
    complexity: "LOW",
    estHoursSavedMonthly: 40,
    estAnnualValue: 20000,
    status: "IDENTIFIED",
    recommendedSpecialist: false,
    businessImpactScore: 30,
    adoptionPotentialScore: 50,
    frequencyScore: 25,
    riskScore: 10,
    toolsRequired: ["Claude"],
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
    toolsRequired: ["QuickBooks"],
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
  const supportEmployees = employees.filter((e) => e.departmentName === "Customer Support").slice(0, 6);

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
          { opportunityId: opportunities.find((o) => o.title === "AI-Assisted Sales Prospecting")?.id },
          { opportunityId: opportunities.find((o) => o.title === "AI-Generated Campaign Briefs & Copy Drafts")?.id },
        ],
      },
    },
  });

  const supportInitiative = await prisma.initiative.create({
    data: {
      organizationId: org.id,
      name: "Customer Support AI Rollout",
      goalDescription: "Deploy AI-assisted response drafting across all support tiers.",
      startDate: monthsAgo(4),
      endDate: monthsAgo(1),
      departments: ["Customer Support"],
      status: "COMPLETED",
      kpis: [
        { label: "AI adoption", baseline: 20, current: 76, target: 75, unit: "%" },
        { label: "Avg. handle time", baseline: 12, current: 8, target: 8, unit: " min" },
        { label: "Training completion", baseline: 0, current: 100, target: 100, unit: "%" },
      ],
      members: {
        create: supportEmployees.map((e, i) => ({ employeeId: e.id, roleOnInitiative: i === 0 ? "Lead" : "Contributor" })),
      },
      workflows: {
        create: [{ opportunityId: opportunities.find((o) => o.title === "AI Conversation Summarization & Response Drafting")?.id }],
      },
    },
  });

  return [salesInitiative, supportInitiative];
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
  const prospectingOpp = opportunities.find((o) => o.title === "AI-Assisted Sales Prospecting");
  const forecastOpp = opportunities.find((o) => o.title === "AI Demand Forecasting Assistant");
  const supportOpp = opportunities.find((o) => o.title === "AI Conversation Summarization & Response Drafting");

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
      opportunityId: forecastOpp?.id,
      workflowId: forecastOpp?.workflowId ?? undefined,
      title: "Demand Forecasting AI Pilot",
      description: "Piloting AI-assisted demand forecasting with external signal integration.",
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
      comment: "Deep expertise in forecasting and very clear about tradeoffs. Planners trust the new process.",
    },
  });

  // Active project
  await prisma.project.create({
    data: {
      organizationId: org.id,
      specialistId: david.id,
      opportunityId: prospectingOpp?.id,
      workflowId: prospectingOpp?.workflowId ?? undefined,
      title: "AI-Assisted Sales Prospecting Implementation",
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
      opportunityId: supportOpp?.id,
      workflowId: supportOpp?.workflowId ?? undefined,
      title: "Support AI Rollout Proposal",
      description: "Proposal to roll out AI-assisted summarization and response drafting across support tiers.",
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
    Marketing: 82,
    Sales: 67,
    Finance: 44,
    Operations: 31,
    "Customer Support": 76,
    HR: 55,
    Product: 48,
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
    { workflowLabel: "AI Customer Support", investment: 22000, annualValue: 180000 },
    { workflowLabel: "AI Sales Research & Prospecting", investment: 18000, annualValue: 120000 },
    { workflowLabel: "AI Marketing Campaigns", investment: 14000, annualValue: 95000 },
    { workflowLabel: "AI Finance Reporting", investment: 12000, annualValue: 75000 },
    { workflowLabel: "AI Operations & Forecasting", investment: 18000, annualValue: 150000 },
  ];
  for (const r of rows) {
    await prisma.rOIMetric.create({ data: { organizationId: org.id, month, ...r } });
  }
}

async function seedUsageEvents(org: { id: string }, employees: { id: string; departmentName: string }[]) {
  const toolsByDept: Record<string, string[]> = {
    Marketing: ["HubSpot AI", "Claude"],
    Sales: ["Salesforce Einstein", "ChatGPT"],
    Finance: ["QuickBooks AI", "ChatGPT"],
    Operations: ["OpenAI", "Excel Copilot"],
    "Customer Support": ["Zendesk AI", "Claude"],
    HR: ["ChatGPT", "Notion AI"],
    Product: ["Notion AI", "Claude"],
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

  console.log("Seeding Northstar Consumer Group...");
  const { org, departments } = await seedNorthstar();

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
