"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui/Spinner";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[0.7rem]" /> : null;
}

/**
 * A link that only changes the query string (a filter, tab, range or page): it keeps the scroll position instead of
 * jumping to the top, and shows a small spinner while the new data loads, so it never feels like the page reloaded.
 */
export function QueryLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link scroll={false} {...props} className={`relative ${className ?? ""}`}>
      {children}
      <Pending />
    </Link>
  );
}
