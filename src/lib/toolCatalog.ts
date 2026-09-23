import type { ToolCategory, ToolApprovalStatus } from "@prisma/client";

export const TOOL_CATEGORY_LABEL: Record<ToolCategory, string> = {
  AI_ASSISTANT: "AI assistant",
  CRM: "CRM",
  ERP: "ERP",
  PRODUCTIVITY: "Productivity",
  DESIGN: "Design",
  DEVELOPMENT: "Development",
  COMMUNICATION: "Communication",
  ANALYTICS: "Analytics",
  CUSTOMER_SERVICE: "Customer service",
  FINANCE: "Finance",
  HR: "HR",
  INTERNAL_PLATFORM: "Internal platform",
  OTHER: "Other",
};

export const TOOL_STATUS_LABEL: Record<ToolApprovalStatus, string> = {
  APPROVED: "Approved",
  RECOMMENDED: "Recommended",
  UNDER_REVIEW: "Under review",
  RESTRICTED: "Restricted",
  DEPRECATED: "Deprecated",
};

export const TOOL_STATUS_TONE: Record<ToolApprovalStatus, "green" | "brand" | "amber" | "red" | "neutral"> = {
  APPROVED: "green",
  RECOMMENDED: "brand",
  UNDER_REVIEW: "amber",
  RESTRICTED: "red",
  DEPRECATED: "neutral",
};

export type CatalogToolSeed = {
  name: string;
  category: ToolCategory;
  vendor: string;
  description: string;
  capabilities: string[];
};

/**
 * The shared global tool catalog every org starts from. Deliberately
 * includes the tool names already used in seeded AIUsageEvent data
 * (ChatGPT, Claude, Salesforce Einstein, HubSpot AI, Notion AI, Zendesk AI,
 * QuickBooks AI, Excel Copilot, OpenAI) so real usage immediately matches a
 * catalog entry, plus common workplace platforms from the broader catalog.
 */
export const GLOBAL_TOOL_CATALOG: CatalogToolSeed[] = [
  { name: "ChatGPT", category: "AI_ASSISTANT", vendor: "OpenAI", description: "General-purpose AI assistant for research, drafting, summarization, and analysis.", capabilities: ["Generative AI", "Research", "Writing", "Analysis", "Custom GPTs"] },
  { name: "Claude", category: "AI_ASSISTANT", vendor: "Anthropic", description: "AI assistant for reasoning, writing, and working with long documents.", capabilities: ["Generative AI", "Reasoning", "Document analysis", "Writing"] },
  { name: "OpenAI", category: "AI_ASSISTANT", vendor: "OpenAI", description: "API-level access to OpenAI's models, often embedded into internal tools.", capabilities: ["Generative AI", "Automation", "Custom integrations"] },
  { name: "Microsoft Copilot", category: "PRODUCTIVITY", vendor: "Microsoft", description: "AI assistant embedded across Microsoft 365 apps.", capabilities: ["Document drafting", "Meeting summaries", "Data analysis", "Email drafting"] },
  { name: "Microsoft 365", category: "PRODUCTIVITY", vendor: "Microsoft", description: "Core productivity suite (Word, Excel, Outlook, Teams).", capabilities: ["Documents", "Spreadsheets", "Email", "Collaboration"] },
  { name: "Excel Copilot", category: "PRODUCTIVITY", vendor: "Microsoft", description: "AI-assisted analysis and formula generation inside Excel.", capabilities: ["Data analysis", "Formula generation", "Trend detection"] },
  { name: "Google Workspace", category: "PRODUCTIVITY", vendor: "Google", description: "Docs, Sheets, Gmail, and Google's AI features (Gemini for Workspace).", capabilities: ["Documents", "Spreadsheets", "Email", "Generative AI"] },
  { name: "Notion AI", category: "PRODUCTIVITY", vendor: "Notion", description: "AI writing and summarization built into Notion docs.", capabilities: ["Summarization", "Writing", "Q&A over docs"] },
  { name: "Slack", category: "COMMUNICATION", vendor: "Salesforce", description: "Team messaging, with AI-assisted thread summaries.", capabilities: ["Messaging", "Thread summaries", "Search"] },
  { name: "Salesforce Einstein", category: "CRM", vendor: "Salesforce", description: "AI features embedded in Salesforce CRM.", capabilities: ["Lead scoring", "Opportunity insights", "Email generation", "Customer summaries"] },
  { name: "HubSpot AI", category: "CRM", vendor: "HubSpot", description: "AI content and insights embedded in HubSpot's CRM and marketing tools.", capabilities: ["Content generation", "Lead scoring", "Campaign insights"] },
  { name: "Zendesk AI", category: "CUSTOMER_SERVICE", vendor: "Zendesk", description: "AI-assisted ticket triage and response drafting in Zendesk.", capabilities: ["Ticket triage", "Response drafting", "Sentiment detection"] },
  { name: "QuickBooks AI", category: "FINANCE", vendor: "Intuit", description: "AI-assisted categorization and reporting in QuickBooks.", capabilities: ["Expense categorization", "Reporting", "Anomaly detection"] },
  { name: "Adobe Photoshop", category: "DESIGN", vendor: "Adobe", description: "Image editing with generative AI features.", capabilities: ["Generative Fill", "Generative Expand", "Object removal"] },
  { name: "Figma", category: "DESIGN", vendor: "Figma", description: "Collaborative design tool with AI-assisted layout and content features.", capabilities: ["Design", "Prototyping", "AI layout suggestions"] },
  { name: "Jira", category: "DEVELOPMENT", vendor: "Atlassian", description: "Issue tracking, with AI-assisted summaries and triage.", capabilities: ["Issue tracking", "Sprint planning", "AI summaries"] },
  { name: "Asana", category: "DEVELOPMENT", vendor: "Asana", description: "Work management with AI-assisted status updates and summaries.", capabilities: ["Task management", "Status summaries", "Workflow automation"] },
  { name: "ServiceNow", category: "ERP", vendor: "ServiceNow", description: "Enterprise workflow and IT service management platform.", capabilities: ["Ticketing", "Workflow automation", "AI triage"] },
  { name: "SAP", category: "ERP", vendor: "SAP", description: "Enterprise resource planning with AI-assisted analysis and reporting.", capabilities: ["Business analysis", "Reporting", "Process assistance"] },
  { name: "Workday", category: "HR", vendor: "Workday", description: "HR and finance platform with AI-assisted insights.", capabilities: ["HR data", "Workforce planning", "AI insights"] },
];
