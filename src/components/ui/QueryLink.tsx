"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" /> : null;
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
