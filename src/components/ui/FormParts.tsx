import type { ReactNode } from "react";
import { cn } from "./cn";

/** One button vocabulary for every form: a single filled primary, a quiet outlined secondary, a text-only tertiary. */
export const btnPrimary = "rounded-full bg-brand-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary = "rounded-full border border-ink-300 bg-white px-5 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-surface-hover disabled:opacity-50";
export const btnGhost = "rounded-full px-3 py-2 text-sm font-medium text-ink-600 hover:bg-surface-hover hover:text-ink-900";

/**
 * The container every create/edit form sits in: a white, bordered, softly raised panel with a header, a body of
 * sections separated by hairlines, and a footer that keeps the actions in one predictable place.
 */
export function FormPanel({ title, description, onClose, children, actions, className }: { title: string; description?: string; onClose?: () => void; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("expand-panel overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
        {onClose && <button type="button" onClick={onClose} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ink-600 hover:bg-surface-hover hover:text-ink-900">Close</button>}
      </div>
      <div className="divide-y divide-ink-100">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2 border-t border-ink-200 bg-surface-muted px-4 py-3 sm:px-5">{actions}</div>}
    </div>
  );
}

/** A titled group of related fields inside a FormPanel. */
export function FormSection({ title, hint, children, className }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3 px-4 py-4 sm:px-5", className)}>
      {title && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h4>
          {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
