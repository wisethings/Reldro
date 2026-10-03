/** One short phrase of detail for a staff action in the platform console ("from 25 to 40", the reason for a suspension). */
export function staffDetail(action: string, metadata: unknown): string {
  const m = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
  const seats = (v: unknown) => (v === null || v === undefined ? "no limit" : String(v));
  switch (action) {
    case "platform.seats_changed": return `from ${seats(m.from)} to ${seats(m.to)}`;
    case "platform.org_suspended": return typeof m.reason === "string" ? m.reason : "";
    case "platform.org_reactivated": return typeof m.note === "string" ? m.note : "";
    case "platform.invite_resent": return typeof m.email === "string" ? m.email : "";
    case "platform.org_provisioned": return typeof m.adminEmail === "string" ? `first admin ${m.adminEmail}` : "";
    case "product_update.sent": return typeof m.subject === "string" ? m.subject : "";
    default: return "";
  }
}
