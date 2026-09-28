import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Extra standalone templates for the Havenbrook demo, two per department,
 * each tagged with the real tool it's meant to be pasted into (see
 * toolCatalog.ts for the actual global Tool Library entries these names
 * have to match to render as a linked badge instead of a plain one).
 * Idempotent by (organizationId, title) - safe to re-run.
 */
const DEMO_TEMPLATES: { department: string; title: string; prompt: string; tools: string[] }[] = [
  {
    department: "IT",
    title: "Summarize this week's open tickets",
    prompt: "Here are this week's open IT tickets: [paste ticket list]. Group them by root cause, flag anything that's been open more than 3 days, and call out which ones block other teams.",
    tools: ["ServiceNow"],
  },
  {
    department: "IT",
    title: "Draft an incident postmortem",
    prompt: "Here's the raw incident timeline: [paste timestamps/notes]. Draft a postmortem with: what happened, customer impact, root cause, and 2-3 concrete follow-up actions. Keep it blameless - describe the system failure, not who made a mistake.",
    tools: ["ChatGPT"],
  },
  {
    department: "Executive",
    title: "Turn this month's KPI dump into a board-ready summary",
    prompt: "Here are this month's raw KPI numbers vs. last month and vs. target: [paste data]. Write a 4-bullet executive summary: what moved, why, what it means for the plan, and one open risk.",
    tools: ["Power BI", "Microsoft Copilot"],
  },
  {
    department: "Executive",
    title: "Draft talking points for an all-hands",
    prompt: "We're announcing [topic] at this week's all-hands. Context: [paste background]. Draft 5-6 talking points that explain the why, address the obvious question employees will have, and end on what doesn't change.",
    tools: ["ChatGPT"],
  },
  {
    department: "Claims",
    title: "Summarize a claim file for adjuster handoff",
    prompt: "Here's the claim file notes so far: [paste notes]. Summarize into: claim facts, coverage status, open questions, and what the next adjuster needs to do first.",
    tools: ["Claude"],
  },
  {
    department: "Claims",
    title: "Draft a claim decision explanation for review",
    prompt: "This claim was [approved/denied/partially approved] because [reason]. Draft a plain-language explanation of the decision and the policy terms it's based on, for a claims manager to review before it goes to the policyholder.",
    tools: ["ChatGPT"],
  },
  {
    department: "Finance",
    title: "Explain this month's expense variance in plain English",
    prompt: "Here's this month's actual vs. budget by category: [paste numbers]. Write 3-4 sentences explaining the biggest variances in plain language a non-finance manager would understand.",
    tools: ["Excel Copilot", "QuickBooks AI"],
  },
  {
    department: "Finance",
    title: "Draft a vendor invoice dispute email",
    prompt: "We were billed $[amount] by [vendor] for [description], but our records show [discrepancy]. Draft a professional email disputing the charge and requesting a corrected invoice, with the discrepancy clearly documented.",
    tools: ["ChatGPT"],
  },
  {
    department: "Sales",
    title: "Research a prospect before a first call",
    prompt: "I have a first call with [company name], a [industry] company. Pull together: recent news, likely pain points for a company their size, and 3 discovery questions specific to their situation - not generic ones.",
    tools: ["Salesforce Einstein", "ChatGPT"],
  },
  {
    department: "Sales",
    title: "Draft a renewal outreach email",
    prompt: "[Customer]'s contract renews on [date]. Usage this year: [summary]. Draft a renewal outreach email that references their actual usage/results, not a generic check-in, and proposes a time to talk.",
    tools: ["HubSpot AI"],
  },
  {
    department: "HR",
    title: "Draft interview questions for a role",
    prompt: "We're hiring a [role title] who needs to be strong at [key skills]. Draft 6 interview questions that surface real evidence of those skills, plus 2 follow-up probes for vague answers.",
    tools: ["ChatGPT"],
  },
  {
    department: "HR",
    title: "Summarize employee engagement survey themes",
    prompt: "Here are the open-text comments from this quarter's engagement survey: [paste comments]. Group them into 3-5 themes, note which are new vs. recurring from last quarter, and flag anything urgent.",
    tools: ["Workday"],
  },
  {
    department: "Customer Service",
    title: "Draft a response to an upset customer",
    prompt: "Customer's issue: [paste their message]. Our situation: [what actually happened, what we can offer]. Draft an empathetic response that acknowledges the frustration, explains what happened without over-promising, and states the resolution clearly.",
    tools: ["Zendesk AI"],
  },
  {
    department: "Customer Service",
    title: "Summarize a long support thread for handoff",
    prompt: "Here's the full support thread: [paste thread]. Summarize into: what the customer wants, what's already been tried, and what the next agent needs to know before responding.",
    tools: ["Zendesk AI"],
  },
  {
    department: "Compliance",
    title: "Check marketing copy against required disclosures",
    prompt: "Here's draft marketing copy: [paste copy]. Check it against our standard disclosure requirements for [product type] and flag any claims that need a disclaimer, are potentially misleading, or are missing required language.",
    tools: ["Claude"],
  },
  {
    department: "Compliance",
    title: "Summarize a new regulation's impact on our process",
    prompt: "Here's the text of a new regulation affecting [area]: [paste text or summary]. Summarize what changes for us operationally, by when we need to comply, and which team likely owns each change.",
    tools: ["Claude"],
  },
  {
    department: "Underwriting",
    title: "Research public risk signals for a commercial applicant",
    prompt: "Applicant: [company name], applying for [coverage type]. Pull together publicly available signals relevant to underwriting risk (news, industry trends, known incidents) - flag anything that needs a follow-up question, don't make a coverage decision.",
    tools: ["ChatGPT"],
  },
  {
    department: "Underwriting",
    title: "Draft a rationale memo for a pricing exception",
    prompt: "We're considering a pricing exception for [applicant/policy] because [reason]. Draft a short rationale memo documenting the standard rate, the proposed exception, and the business justification, for underwriting file documentation.",
    tools: ["ChatGPT"],
  },
  {
    department: "Marketing",
    title: "Turn one campaign brief into channel-specific copy",
    prompt: "Here's the campaign brief: [paste brief]. Write copy for: a LinkedIn post, a short email subject + preview line, and a 1-sentence ad headline - same core message, each adapted to how people actually read that channel.",
    tools: ["ChatGPT", "HubSpot AI"],
  },
  {
    department: "Marketing",
    title: "Draft social captions from a blog post",
    prompt: "Here's our latest blog post: [paste post or summary]. Draft 3 social captions (LinkedIn, X, and one generic) that each lead with a different angle from the post, not just a restated headline.",
    tools: ["ChatGPT"],
  },
  {
    department: "Legal",
    title: "Summarize a contract's key obligations and dates",
    prompt: "Here's the contract: [paste text or key sections]. Summarize: each party's key obligations, renewal/termination dates, and any unusual clauses (indemnification, liability caps, exclusivity) a business reviewer should know about.",
    tools: ["Claude"],
  },
  {
    department: "Legal",
    title: "Draft a redline explanation for a counterparty",
    prompt: "We redlined [clause] in the contract from [standard language] to [our proposed language] because [reason]. Draft a brief, professional explanation of the change to send to the counterparty's legal team.",
    tools: ["Claude"],
  },
  {
    department: "Operations",
    title: "Turn a process walkthrough into a documented SOP",
    prompt: "Here's a rough walkthrough of how we currently do [process]: [paste notes/transcript]. Turn it into a numbered SOP with clear steps, who's responsible for each, and any decision points called out.",
    tools: ["Notion AI"],
  },
  {
    department: "Operations",
    title: "Summarize a vendor's SLA for renewal review",
    prompt: "Here's our current SLA with [vendor]: [paste terms]. Summarize the key commitments, any penalties for missed SLAs, and flag terms that look weaker than industry standard for renewal negotiation.",
    tools: ["ChatGPT"],
  },
];

export async function seedDemoTemplates(organizationName: string) {
  const org = await prisma.organization.findFirst({ where: { name: organizationName } });
  if (!org) return { created: 0, skipped: 0, orgFound: false, departmentsCreated: 0 };

  // The global workflow/course catalog references departments (IT,
  // Executive, Legal) that this org never got a real Department row for -
  // nobody happened to be hired into them during employee seeding. Without
  // a real row, Templates/Learn/Opportunities (which scope to the org's
  // actual Department rows, not just whatever strings appear on Workflow
  // records) would silently exclude any template tagged for them, however
  // correctly it's department-tagged.
  const neededDepartments = Array.from(new Set(DEMO_TEMPLATES.map((t) => t.department)));
  const existingDepartments = await prisma.department.findMany({ where: { organizationId: org.id }, select: { name: true } });
  const existingDeptNames = new Set(existingDepartments.map((d) => d.name));
  const missingDepartments = neededDepartments.filter((name) => !existingDeptNames.has(name));
  for (const name of missingDepartments) {
    await prisma.department.create({ data: { organizationId: org.id, name } });
  }

  const existing = await prisma.template.findMany({ where: { organizationId: org.id }, select: { title: true } });
  const existingTitles = new Set(existing.map((t) => t.title));

  let created = 0;
  for (const t of DEMO_TEMPLATES) {
    if (existingTitles.has(t.title)) continue;
    await prisma.template.create({
      data: { organizationId: org.id, department: t.department, title: t.title, prompt: t.prompt, tools: t.tools, createdByName: "Reldro" },
    });
    created++;
  }

  return { created, skipped: DEMO_TEMPLATES.length - created, orgFound: true, departmentsCreated: missingDepartments.length };
}
