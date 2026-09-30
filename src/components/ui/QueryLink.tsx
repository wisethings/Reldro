"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  // A thin sliding line along the bottom edge: clearly "loading", but it sits outside the label, so it can't cover text or resize the control.
  return pending ? <span aria-hidden className="pending-bar" /> : null;
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
