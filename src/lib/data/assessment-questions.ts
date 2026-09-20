import type { OrgMaturityCategory, EmployeeSkillCategory } from "@/lib/scoring";

export type AssessmentQuestion<TCategory extends string> = {
  key: string;
  category: TCategory;
  text: string;
};

export const ORG_ASSESSMENT_QUESTIONS: AssessmentQuestion<OrgMaturityCategory>[] = [
  { key: "lit_1", category: "literacy", text: "Employees understand what generative AI can and can't do for their role." },
  { key: "lit_2", category: "literacy", text: "Employees can explain the basics of how AI tools produce their output." },
  { key: "usage_1", category: "usage", text: "Employees regularly use AI tools as part of their daily work." },
  { key: "usage_2", category: "usage", text: "AI usage extends beyond a small group of early adopters." },
  { key: "wf_1", category: "workflowIntegration", text: "AI is embedded directly into our core workflows and tools, not just used ad hoc." },
  { key: "wf_2", category: "workflowIntegration", text: "We have documented AI-enabled versions of our key processes." },
  { key: "gov_1", category: "governance", text: "We have clear policies on acceptable AI use, data privacy, and risk." },
  { key: "gov_2", category: "governance", text: "There is a defined owner accountable for AI adoption." },
  { key: "meas_1", category: "measurement", text: "We track how much time or cost AI is saving us." },
  { key: "meas_2", category: "measurement", text: "We can quantify the business impact of our AI initiatives." },
  { key: "lead_1", category: "leadershipAdoption", text: "Senior leadership actively uses and champions AI tools." },
  { key: "lead_2", category: "leadershipAdoption", text: "Leadership allocates budget and time toward AI adoption." },
];

export const EMPLOYEE_ASSESSMENT_QUESTIONS: AssessmentQuestion<EmployeeSkillCategory>[] = [
  { key: "fund_1", category: "fundamentals", text: "I understand the strengths and limitations of generative AI tools." },
  { key: "fund_2", category: "fundamentals", text: "I can identify which of my tasks are good candidates for AI assistance." },
  { key: "prompt_1", category: "prompting", text: "I can write clear, specific prompts that get useful results on the first try." },
  { key: "prompt_2", category: "prompting", text: "I iterate on prompts effectively when the first result isn't good enough." },
  { key: "wfd_1", category: "workflowDesign", text: "I can redesign a multi-step task to incorporate AI at the right points." },
  { key: "wfd_2", category: "workflowDesign", text: "I know how to combine AI output with human review checkpoints." },
  { key: "eval_1", category: "evaluation", text: "I can quickly judge whether AI output is accurate and usable." },
  { key: "eval_2", category: "evaluation", text: "I catch errors or hallucinations in AI-generated content before using it." },
  { key: "auto_1", category: "automation", text: "I use AI to automate repetitive parts of my job, not just one-off questions." },
  { key: "auto_2", category: "automation", text: "I'm comfortable setting up simple AI-powered workflows or automations." },
];

export const LIKERT_LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

export function likertToScore(value: number): number {
  // value is 1-5 -> normalize to 0-100
  return Math.round(((value - 1) / 4) * 100);
}
