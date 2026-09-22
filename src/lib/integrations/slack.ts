import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Real Slack OAuth (authorization code grant). This is the one integration
 * wired up end-to-end as the concrete example of "real" vs. the mock
 * connect-toggle the other 11 catalog integrations still use - each of
 * those would need the same treatment (their own OAuth app + secrets).
 */
export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

function getStateSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

export type SlackOAuthState = { organizationId: string; integrationId: string };

export async function signSlackState(payload: SlackOAuthState): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getStateSecret());
}

export async function verifySlackState(token: string): Promise<SlackOAuthState | null> {
  try {
    const { payload } = await jwtVerify(token, getStateSecret());
    return payload as unknown as SlackOAuthState;
  } catch {
    return null;
  }
}

export function slackAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "chat:write,channels:read,team:read",
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export type SlackTokenResult =
  | { ok: true; accessToken: string; teamId: string; teamName: string }
  | { ok: false; error: string };

export async function exchangeSlackCode(code: string, redirectUri: string): Promise<SlackTokenResult> {
  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!data.ok) return { ok: false, error: data.error ?? "unknown_error" };
  return { ok: true, accessToken: data.access_token, teamId: data.team?.id, teamName: data.team?.name };
}
