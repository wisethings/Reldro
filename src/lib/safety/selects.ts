/**
 * Report columns for lists, tables and counts. A report can carry up to three photos stored inline, so selecting the
 * whole row for a page of reports could move many megabytes just to draw titles. Lists select these fields instead;
 * detail pages load the full row.
 */
export const REPORT_LIST_FIELDS = {
  id: true,
  organizationId: true,
  number: true,
  type: true,
  category: true,
  title: true,
  description: true,
  siteId: true,
  occurredAt: true,
  severity: true,
  status: true,
  privacy: true,
  injuryInvolved: true,
  reporterId: true,
  ownerId: true,
  respondBy: true,
  acknowledgedAt: true,
  aiAssisted: true,
  closedAt: true,
  locationNote: true,
  severityConfirmedAt: true,
  inspectionId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Corrective action columns for lists (skips the inline evidence photos). */
export const ACTION_LIST_FIELDS = {
  id: true,
  organizationId: true,
  number: true,
  reportId: true,
  inspectionId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  ownerId: true,
  dueDate: true,
  proposedById: true,
  approvedById: true,
  approvedAt: true,
  completedAt: true,
  completionNotes: true,
  verifiedById: true,
  verifiedAt: true,
  createdAt: true,
} as const;
