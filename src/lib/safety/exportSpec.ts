/** The datasets and columns offered on the export panel. Plain data, shared by the panel (browser) and the download route (server). */
export type Column = { key: string; label: string; on: boolean };
export type DatasetSpec = { key: string; label: string; hint: string; columns: Column[] };

const c = (key: string, label: string, on = true): Column => ({ key, label, on });

export const DATASETS: DatasetSpec[] = [
  {
    key: "reports", label: "Reports", hint: "One row per report in the period.",
    columns: [c("reference", "Reference"), c("reported", "Reported"), c("occurred", "Occurred"), c("kind", "Kind"), c("topic", "Topic"), c("seriousness", "Seriousness"), c("confirmed", "Seriousness confirmed"), c("status", "Status"), c("incident", "Incident response"), c("site", "Site"), c("location", "Location detail", false), c("injury", "Injury involved"), c("owner", "Owner"), c("responseDue", "Response due"), c("hoursToAck", "Hours to acknowledge"), c("closed", "Closed", false), c("title", "Title"), c("description", "Description", false)],
  },
  {
    key: "actions", label: "Corrective actions", hint: "Every action created or due in the period, plus all that are still open.",
    columns: [c("reference", "Reference"), c("title", "Title"), c("priority", "Priority"), c("status", "Status"), c("owner", "Owner"), c("due", "Due"), c("overdue", "Overdue"), c("site", "Site"), c("from", "From"), c("created", "Created"), c("completed", "Completed"), c("verified", "Verified"), c("daysToVerify", "Days to verify", false)],
  },
  {
    key: "inspections", label: "Inspections", hint: "Inspections due in the period, plus any still scheduled.",
    columns: [c("checklist", "Checklist"), c("site", "Site"), c("due", "Due"), c("status", "Status"), c("onTime", "Completed on time"), c("completed", "Completed"), c("assignee", "Assigned to"), c("checked", "Items checked"), c("failed", "Items failed"), c("failedItems", "Failed items", false)],
  },
  {
    key: "talks", label: "Toolbox talk acknowledgements", hint: "One row per person per talk, so you can see who has not acknowledged.",
    columns: [c("talk", "Talk"), c("scheduled", "Scheduled"), c("person", "Person"), c("site", "Home site"), c("crew", "Crew"), c("acknowledged", "Acknowledged"), c("acknowledgedAt", "Acknowledged on")],
  },
  {
    key: "certifications", label: "Certifications", hint: "One row per person per required certification, with its state.",
    columns: [c("person", "Person"), c("site", "Home site"), c("crew", "Crew"), c("certification", "Certification"), c("state", "State"), c("issued", "Issued"), c("expires", "Expires"), c("certificateNumber", "Certificate number", false), c("verified", "Verified")],
  },
];

export const datasetSpec = (key: string | null | undefined) => DATASETS.find((d) => d.key === key) ?? null;
