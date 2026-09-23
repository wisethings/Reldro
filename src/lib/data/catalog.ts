// Ordered by ICP priority: Tier 1 (Professional Services, Business Services,
// Technology/SaaS) first, Tier 2 (Insurance, Financial Services,
// Manufacturing) next, then the rest.
export const INDUSTRIES = [
  "Professional services",
  "Business services",
  "Technology",
  "Insurance",
  "Financial services",
  "Manufacturing",
  "Healthcare",
  "Retail",
  "Consumer products (CPG)",
  "Logistics",
  "Real estate",
  "Media",
  "Hospitality",
  "Education",
  "Government",
  "Legal",
  "Marketing agency",
  "Other",
];

export const COMPANY_SIZES = ["1-50", "51-200", "201-500", "501-1000", "1000-5000", "5000+"];

export const REVENUE_RANGES = [
  "Pre-revenue",
  "$1M-$10M",
  "$10M-$50M",
  "$50M-$250M",
  "$250M-$1B",
  "$1B+",
];

export const GEOGRAPHIES = ["North America", "Europe", "Asia-Pacific", "Latin America", "Middle East & Africa", "Global"];

export const BUSINESS_MODELS = ["B2B", "B2C", "B2B2C", "Marketplace", "Nonprofit / Government"];

export const AI_GOALS = [
  "Increase productivity",
  "Reduce costs",
  "Improve customer experience",
  "Automate repetitive work",
  "Improve employee capabilities",
  "Improve sales",
  "Improve marketing",
  "Improve operations",
  "Improve decision making",
  "Build AI products",
];

export const DEPARTMENT_OPTIONS = [
  "Marketing",
  "Sales",
  "Finance",
  "HR",
  "Operations",
  "Customer Success",
  "Customer Support",
  "Product",
  "Engineering",
  "Legal",
  "Executive",
];

export const INTEGRATION_CATALOG: { key: string; name: string; category: string; description: string }[] = [
  { key: "google_workspace", name: "Google Workspace", category: "Productivity", description: "Gmail, Docs, Sheets, and Calendar." },
  { key: "microsoft_365", name: "Microsoft 365", category: "Productivity", description: "Outlook, Word, Excel, and Teams." },
  { key: "slack", name: "Slack", category: "Communication", description: "Team messaging and channels." },
  { key: "salesforce", name: "Salesforce", category: "CRM", description: "Sales pipeline and customer records." },
  { key: "hubspot", name: "HubSpot", category: "CRM", description: "Marketing, sales, and service hub." },
  { key: "notion", name: "Notion", category: "Knowledge", description: "Docs, wikis, and project tracking." },
  { key: "jira", name: "Jira", category: "Engineering", description: "Issue tracking and sprints." },
  { key: "zendesk", name: "Zendesk", category: "Support", description: "Customer support ticketing." },
  { key: "shopify", name: "Shopify", category: "Commerce", description: "Ecommerce storefront and orders." },
  { key: "asana", name: "Asana", category: "Project management", description: "Task and project tracking." },
  { key: "monday", name: "Monday.com", category: "Project management", description: "Work OS and boards." },
  { key: "quickbooks", name: "QuickBooks", category: "Finance", description: "Accounting and invoicing." },
];
