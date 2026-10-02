import { qualStatus } from "./dates";

/**
 * Certification compliance, in one place so the page, the CSV export and the tests agree.
 *
 * A person "holds" a certification when they have a record that counts toward it: linked to the catalog entry, or, for older
 * free-text records, with the same name. When there are several records, the one that lasts longest counts, so a renewal
 * replaces the expired record it follows without anyone deleting history.
 */

export type CertType = { id: string; name: string; requiredScope: string; requiredSiteIds: string[]; requiredCrewIds: string[] };
export type CertPerson = { id: string; siteId: string | null; departmentId: string | null };
export type CertRecord = { id: string; employeeId: string; typeId: string | null; name: string; expiresOn: Date | null; issuedOn: Date | null };

export type CertState = "valid" | "expiring" | "expired" | "missing";

export type Requirement = { employeeId: string; typeId: string; state: CertState; record: CertRecord | null };

const norm = (s: string) => s.trim().toLowerCase();

/** Whether this person is required to hold this certification. */
export function isRequired(type: Pick<CertType, "requiredScope" | "requiredSiteIds" | "requiredCrewIds">, person: Pick<CertPerson, "siteId" | "departmentId">): boolean {
  if (type.requiredScope === "ALL") return true;
  if (type.requiredScope !== "SELECTED") return false;
  return Boolean((person.siteId && type.requiredSiteIds.includes(person.siteId)) || (person.departmentId && type.requiredCrewIds.includes(person.departmentId)));
}

const lastsLonger = (a: CertRecord, b: CertRecord) => (a.expiresOn?.getTime() ?? Infinity) >= (b.expiresOn?.getTime() ?? Infinity);

/** The record that counts for a person and certification, or null. */
export function bestRecord(records: CertRecord[], employeeId: string, type: Pick<CertType, "id" | "name">): CertRecord | null {
  let best: CertRecord | null = null;
  for (const r of records) {
    if (r.employeeId !== employeeId) continue;
    if (!(r.typeId === type.id || (!r.typeId && norm(r.name) === norm(type.name)))) continue;
    if (!best || lastsLonger(r, best)) best = r;
  }
  return best;
}

export function stateOf(record: CertRecord | null, now: Date = new Date()): CertState {
  if (!record) return "missing";
  const s = qualStatus(record.expiresOn, now);
  return s === "current" ? "valid" : s === "soon" ? "expiring" : "expired";
}

/** Every (person, required certification) pair with its state. */
export function requirementsFor(types: CertType[], people: CertPerson[], records: CertRecord[], now: Date = new Date()): Requirement[] {
  const out: Requirement[] = [];
  for (const t of types) {
    for (const p of people) {
      if (!isRequired(t, p)) continue;
      const record = bestRecord(records, p.id, t);
      out.push({ employeeId: p.id, typeId: t.id, state: stateOf(record, now), record });
    }
  }
  return out;
}

export type Coverage = { required: number; valid: number; expiring: number; expired: number; missing: number; compliant: number; pct: number | null };

/** Counts for a set of requirements. "Compliant" means held and not expired (expiring soon still counts). */
export function coverage(reqs: Pick<Requirement, "state">[]): Coverage {
  const c = { required: reqs.length, valid: 0, expiring: 0, expired: 0, missing: 0 };
  for (const r of reqs) c[r.state]++;
  const compliant = c.valid + c.expiring;
  return { ...c, compliant, pct: c.required === 0 ? null : Math.round((compliant / c.required) * 100) };
}

/** Suggested expiry for a record: the issue date plus the catalog's validity, or null when it does not expire. */
export function suggestedExpiry(issuedOn: Date, validityMonths: number | null | undefined): Date | null {
  if (!validityMonths || validityMonths <= 0) return null;
  const d = new Date(Date.UTC(issuedOn.getUTCFullYear(), issuedOn.getUTCMonth() + validityMonths, issuedOn.getUTCDate()));
  // Jan 31 + 1 month should be the end of February, not March 3.
  if (d.getUTCDate() !== issuedOn.getUTCDate()) d.setUTCDate(0);
  return d;
}

export const STATE_LABEL: Record<CertState, string> = { valid: "Current", expiring: "Expiring soon", expired: "Expired", missing: "Missing" };
