"use client";

import { useState, useTransition } from "react";
import { unwrap } from "@/lib/actionResult";
import { useRouter } from "next/navigation";

/** Runs a server action, refreshes the page on success, and surfaces the thrown message instead of crashing. */
export function useAct() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await fn());
        after?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  };
  return { run, pending, error, setError };
}
