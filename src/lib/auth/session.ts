import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "reldro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
/** Reldro staff can see every customer, so their sign-in expires after a working day. */
const STAFF_SESSION_TTL_SECONDS = 60 * 60 * 8;

export const sessionTtl = (role: Role) => (role === "PLATFORM_ADMIN" ? STAFF_SESSION_TTL_SECONDS : SESSION_TTL_SECONDS);

export type SessionPayload = {
  sub: string; // userId
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  employeeId: string | null;
  specialistId: string | null;
  /** Reldro staff only: true once the second sign-in step (authenticator code) has been completed in this session. */
  mfa?: boolean;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload, ttlSeconds: number = sessionTtl(payload.role)): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtl(payload.role),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
