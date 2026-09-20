import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/platform-admin"];

async function isAuthenticated(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authed = await isAuthenticated(token);

  if (!authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/platform-admin/:path*"],
};
