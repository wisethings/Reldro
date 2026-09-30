import { NextRequest, NextResponse } from "next/server";
import { secretMatches } from "@/lib/secret";
import { emailShell, fromAddress, isEmailConfigured, sendEmail } from "@/lib/email";

/**
 * Sends one real test email so email delivery can be checked after a deploy, and says what is wrong when it fails.
 * Protected by SEED_SECRET. Use: /api/admin/email-test?secret=...&to=you@company.com
 */
export async function GET(request: NextRequest) {
  const expected = process.env.SEED_SECRET;
  const given = request.headers.get("x-seed-secret") ?? request.nextUrl.searchParams.get("secret");
  if (!secretMatches(given, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const to = request.nextUrl.searchParams.get("to") ?? "";
  const from = fromAddress();
  const config = { resendKeySet: isEmailConfigured(), from, supportEmailSet: Boolean(process.env.SUPPORT_EMAIL), appUrl: process.env.APP_URL || "(default: https://app.reldro.com)" };
  if (!config.resendKeySet) return NextResponse.json({ ok: false, config, problem: "RESEND_API_KEY is not set in this environment. Add it in Netlify environment variables and redeploy." }, { status: 200 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ ok: false, config, problem: "Add ?to=an-email-address to the URL." }, { status: 200 });

  const res = await sendEmail({ to, subject: "Reldro email test", html: emailShell({ bodyHtml: "<p>This is a test email from Reldro. If you can read it, email delivery works.</p>" }) });
  let hint: string | undefined;
  if (!res.sent) {
    if (/domain is not verified|not verified/i.test(res.error ?? "")) hint = `The domain in ${from} is not verified in Resend. Verify it under Domains, or change EMAIL_FROM to an address on a verified domain.`;
    else if (/only send testing emails to your own email/i.test(res.error ?? "")) hint = "Resend is in testing mode: it only delivers to the account owner until a domain is verified. Verify your domain and set EMAIL_FROM to an address on it.";
    else if (/API key is invalid|invalid api key/i.test(res.error ?? "")) hint = "The Resend API key is invalid or was revoked. Create a new one and update RESEND_API_KEY.";
  }
  return NextResponse.json({ ok: res.sent, config, error: res.error ?? null, hint: hint ?? null });
}
