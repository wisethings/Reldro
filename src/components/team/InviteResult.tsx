import type { InviteDelivery } from "@/lib/invites";

export function InviteResult({ result, className = "" }: { result: ({ error?: string } & InviteDelivery) | undefined; className?: string }) {
  if (!result) return null;
  if (result.error) return <p className={`text-sm text-danger ${className}`}>{result.error}</p>;
  if (result.emailSent) {
    return <p className={`rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep ${className}`}>Invited. An email with their login details was sent.</p>;
  }
  if (result.tempPassword) {
    return (
      <p className={`rounded-lg bg-sage px-3 py-2 text-sm text-sage-deep ${className}`}>
        Account created, but the email wasn&apos;t sent{result.emailError ? ` (${result.emailError})` : ""}. Share this temporary password with them directly:{" "}
        <span className="font-mono font-semibold">{result.tempPassword}</span>
      </p>
    );
  }
  return null;
}
