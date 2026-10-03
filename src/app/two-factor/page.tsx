import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/guards";
import { generateTotpSecret, openSecret, otpauthUrl, sealSecret } from "@/lib/auth/totp";
import { logout } from "@/lib/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";
import { authHint } from "@/components/auth/styles";

export const dynamic = "force-dynamic";

/** Reldro staff only. Everyone else is sent home. First visit sets up an authenticator app; later visits ask for the current code. */
export default async function TwoFactorPage() {
  const session = await requireSession();
  if (session.role !== "PLATFORM_ADMIN") redirect("/dashboard/overview");
  if (session.mfa) redirect("/platform-admin");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { email: true, totpSecret: true, totpEnabledAt: true } });
  if (!user) redirect("/login");
  const enabled = Boolean(user.totpEnabledAt);

  let setup: { secret: string; qr: string } | null = null;
  if (!enabled) {
    // The pending secret is kept until it is confirmed, so reloading the page doesn't invalidate the code already in the app.
    let secret = user.totpSecret ? openSecret(user.totpSecret) : null;
    if (!secret) {
      secret = generateTotpSecret();
      await prisma.user.update({ where: { id: session.sub }, data: { totpSecret: sealSecret(secret), totpLastStep: null } });
    }
    setup = { secret, qr: await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 192 }) };
  }

  return (
    <AuthShell>
      <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">{enabled ? "Enter your code" : "Set up two-factor sign-in"}</h1>
      <p className={`${authHint} mt-2`}>
        {enabled ? "Open your authenticator app and enter the 6-digit code for Reldro." : "Reldro staff accounts need a second step because they can reach every customer. It takes a minute."}
      </p>
      {setup && (
        <div className="mt-5 space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-700">
            <li>Install an authenticator app (1Password, Google Authenticator, Authy).</li>
            <li>Scan this code, or type the key in by hand.</li>
            <li>Enter the 6-digit code it shows below.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-oxblood/[0.09] bg-surface-muted p-4 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code to scan with your authenticator app" width={160} height={160} className="shrink-0 rounded bg-white p-1" />
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-xs text-ink-500">Setup key</p>
              <p data-testid="totp-secret" className="mt-1 break-all tabular-nums text-sm tracking-wider text-ink-900">{setup.secret}</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6">
        <TwoFactorForm setup={!enabled} />
      </div>
      <form action={logout} className="mt-5 text-center">
        <button type="submit" className="text-[13px] font-medium text-orchid-deep hover:text-oxblood">Sign out</button>
      </form>
    </AuthShell>
  );
}
