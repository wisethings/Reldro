"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ui/Logo";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink-50 px-6 text-center">
      <Logo height={28} />
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-500">This page hit an unexpected error. You can try again, or head back to your dashboard.</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Try again
        </button>
        <a href="/dashboard" className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
