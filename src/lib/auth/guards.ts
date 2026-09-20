import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}

export async function requireOrganization(): Promise<SessionPayload & { organizationId: string }> {
  const session = await requireSession();
  if (!session.organizationId) redirect("/onboarding");
  return session as SessionPayload & { organizationId: string };
}
