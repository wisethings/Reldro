import { Children, cloneElement, isValidElement, useId } from "react";
import type { InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Shared, compact control styling for every text input/select/textarea in
 * the app - a single definition instead of each form hand-rolling its own
 * (previously inconsistent: some forms had a focus ring, some didn't; some
 * used ink-300 borders, some ink-200). Sized for density: enough padding to
 * stay comfortable to click, not so much that a form of 6 short fields
 * forces a page of scrolling.
 */
export const controlClass =
  "w-full rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-sm md:py-1.5 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClass, "resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, "bg-white", props.className)} />;
}

/**
 * Label + control + optional caption, all sized to stack tightly - this is
 * the unit most forms are built from. Wrap any input/select/textarea/custom
 * control (e.g. ToolMultiSelect) in it for a consistent label style instead
 * of each form writing its own <label> markup.
 */
export function Field({
  label,
  hint,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const autoId = useId();
  // When the field wraps exactly one control, tie the label (and the hint) to it so screen readers and
  // "click the label to focus" work. With several controls inside, the wrapper keeps its plain label.
  const only = Children.count(children) === 1 && isValidElement(children) ? (children as ReactElement<{ id?: string; "aria-describedby"?: string }>) : null;
  const controlId = only ? only.props.id ?? `f${autoId}` : undefined;
  const hintId = hint && only ? `${controlId}-hint` : undefined;
  const control = only
    ? cloneElement(only, { id: controlId, "aria-describedby": [only.props["aria-describedby"], hintId].filter(Boolean).join(" ") || undefined })
    : children;
  return (
    <div className={className}>
      <label htmlFor={controlId} className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </span>
        {optional && <span className="text-xs text-ink-500">Optional</span>}
      </label>
      <div className="mt-1">{control}</div>
      {hint && <p id={hintId} className="mt-1 text-xs leading-snug text-ink-500">{hint}</p>}
    </div>
  );
}

/** Packs short fields (title, select, number, date...) onto one row instead of stacking them full-width - the main lever against wasted vertical space. Falls back to a single column below `sm`. */
export function FieldGrid({ columns = 2, className, children }: { columns?: 2 | 3 | 4; className?: string; children: ReactNode }) {
  const colsClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return <div className={cn("grid grid-cols-1 gap-3", colsClass, className)}>{children}</div>;
}

/** A form's own vertical rhythm - slightly tighter than a page's section spacing so a form of many small fields doesn't sprawl. */
export function FormStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

/**
 * Groups a few related fields under a small caption, with a hairline
 * separator above every group after the first - turns a long flat stack of
 * fields into scannable sections without the visual weight of full Cards.
 */
export function FieldSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-3", title && "border-t border-ink-100 pt-4 first:border-0 first:pt-0")}>
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>}
      {children}
    </div>
  );
}
