import type { Metadata } from "next";
import Link from "next/link";
import { FollowUpClient } from "@/components/safety/FollowUpClient";

export const metadata: Metadata = { title: "Check for updates on a report", robots: { index: false, follow: false } };

export default function FollowUpPage() {
  return (
    <main className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <Link href="/login" className="text-xs font-medium text-ink-500 hover:text-ink-800">← Reldro</Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink-900">Check for updates on a report</h1>
          <p className="mt-1 text-sm text-ink-600">
            Submitted a report without your name? Enter the private case code you received to read replies and answer questions. You do not need to sign in, and Reldro does not link the code to your account.
          </p>
        </div>
        <FollowUpClient />
        <p className="text-xs text-ink-500">
          Reldro is not an emergency service. If someone needs urgent help, call your local emergency number first.
        </p>
      </div>
    </main>
  );
}
