import type { Metadata } from "next";
import Link from "next/link";
import { FollowUpClient } from "@/components/safety/FollowUpClient";

export const metadata: Metadata = { title: "Check for updates on a report", robots: { index: false, follow: false } };

export default function FollowUpPage() {
  return (
    <main className="min-h-[100dvh] bg-ink-50 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
      <div className="mx-auto w-full max-w-[680px]">
        <div>
          <Link href="/login" className="inline-block text-[13px] font-medium text-ink-500 transition-colors duration-150 hover:text-ink-800 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">← Reldro</Link>
          <h1 className="mt-9 text-balance text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900 sm:mt-10 sm:text-[30px]">Check for updates on a report</h1>
          <p className="mt-3 max-w-[58ch] text-pretty text-[15px] leading-[1.5] text-ink-600">
            Submitted a report without your name? Enter the private case code you received to read replies and answer questions. You do not need to sign in, and Reldro does not link the code to your account.
          </p>
          <div className="mt-9 sm:mt-10">
            <FollowUpClient />
          </div>
          <div className="mt-9 border-t border-oxblood/[0.08] pt-5 sm:mt-10">
            <p className="max-w-[58ch] text-pretty text-[13px] leading-[1.5] text-ink-500">
              Reldro is not an emergency service. If someone needs urgent help, call your local emergency number first.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
