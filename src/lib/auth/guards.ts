import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";
import { destinationForRole } from "./roleHome";
import { ensureSchemaMigrated } from "@/lib/runMigration";
import { loadAccount } from "./account";

/**
 * The signed session cookie proves who signed in, but it is valid for 14 days, so it can never be the source of truth
 * for what that person may do now. Re-read the account on every request: a deleted or removed person loses access
 * immediately, and a changed role or company takes effect straight away.
 */
export async function getFreshSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await loadAccount(session.sub);
  if (!user) return null;
  // A suspended workspace is locked for everyone in it, immediately, even with a valid cookie.
  if (user.suspendedAt && user.role !== "PLATFORM_ADMIN") return null;
  return { ...session, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId, employeeId: user.employeeId };
}

export async function requireSession(): Promise<SessionPayload> {
  await ensureSchemaMigrated();
  const session = await getFreshSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect(destinationForRole(session.role));
  // Reldro staff must also have passed the authenticator-code step in this session.
  if (session.role === "PLATFORM_ADMIN" && !session.mfa) redirect("/two-factor");
  return session;
}

export async function requireOrganization(): Promise<SessionPayload & { organizationId: string }> {
  const session = await requireSession();
  if (!session.organizationId) redirect("/onboarding");
  return session as SessionPayload & { organizationId: string };
}
